const { createApp, ref, onMounted, computed } = Vue;

const API_BASE_URL = 'http://localhost:3000';

const app = createApp({
  setup() {
    const lessons = ref([]);
    const error = ref(null);
    const loading = ref(true);
    const view = ref('lessons'); // 'lessons' | 'cart'
    const cart = ref([]);

    // Search state
    const searchQuery = ref('');
    const searchResults = ref(null);
    const searchLoading = ref(false);
    const searchError = ref(null);

    // Teachers state
    const teachers = ref([]);
    const teachersLoading = ref(true);
    const teachersError = ref(null);
    const selectedTeacherId = ref(null);
    const teacherLessons = ref([]);
    const teacherLessonsLoading = ref(false);
    const teacherLessonsError = ref(null);

    // Enrolment state (by lesson ID)
    const enrolmentByLesson = ref({});

    // Checkout form state
    const customerName = ref('');
    const customerPhone = ref('');
    const nameError = ref(null);
    const phoneError = ref(null);
    const orderError = ref(null);
    const orderConfirmed = ref(false);
    const submitting = ref(false);
    const orderId = ref(null);

    const fetchLessons = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/lessons`);
        if (!response.ok) {
          throw new Error(`Failed to load lessons: ${response.status}`);
        }
        lessons.value = await response.json();
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    const SEARCH_DEBOUNCE_MS = 250;
    let searchDebounceTimer = null;
    let lastSearchedQuery = '';

    const executeSearch = async (q) => {
      lastSearchedQuery = q;
      searchLoading.value = true;
      searchError.value = null;

      try {
        const response = await fetch(`${API_BASE_URL}/lessons/search?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Search failed: ${response.status}`);
        }
        const results = await response.json();
        if (searchQuery.value.trim() !== q) return;
        searchResults.value = results.map((result) => {
          const master = lessons.value.find((l) => l._id === result._id);
          return master || result;
        });
      } catch (err) {
        if (searchQuery.value.trim() !== q) return;
        if (lastSearchedQuery === q) {
          lastSearchedQuery = '';
        }
        searchError.value = err.message || 'Failed to search lessons.';
        searchResults.value = null;
      } finally {
        if (searchQuery.value.trim() === q) {
          searchLoading.value = false;
        }
      }
    };

    const onSearchInput = () => {
      if (searchDebounceTimer !== null) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }

      const q = searchQuery.value.trim();

      if (!q) {
        lastSearchedQuery = '';
        searchResults.value = null;
        searchError.value = null;
        searchLoading.value = false;
        return;
      }

      // Skip duplicate API requests when trailing whitespace leaves the trimmed query unchanged.
      if (
        q === lastSearchedQuery &&
        (searchResults.value !== null || searchLoading.value) &&
        !searchError.value
      ) {
        return;
      }

      searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        if (searchQuery.value.trim() === q) {
          executeSearch(q);
        }
      }, SEARCH_DEBOUNCE_MS);
    };

    const fetchTeachers = async () => {
      teachersLoading.value = true;
      teachersError.value = null;
      try {
        const response = await fetch(`${API_BASE_URL}/teachers`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to load teachers: ${response.status}`);
        }
        teachers.value = await response.json();
      } catch (err) {
        teachersError.value = err.message || 'Failed to load teachers.';
      } finally {
        teachersLoading.value = false;
      }
    };

    const fetchTeacherLessons = async (teacherId) => {
      // Collapse the active teacher panel instead of re-fetching when clicked again.
      if (selectedTeacherId.value === teacherId) {
        selectedTeacherId.value = null;
        teacherLessons.value = [];
        teacherLessonsLoading.value = false;
        teacherLessonsError.value = null;
        return;
      }

      selectedTeacherId.value = teacherId;
      teacherLessons.value = [];
      teacherLessonsLoading.value = true;
      teacherLessonsError.value = null;

      try {
        const response = await fetch(`${API_BASE_URL}/teachers/${encodeURIComponent(teacherId)}/lessons`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to load teacher lessons: ${response.status}`);
        }
        const results = await response.json();
        if (selectedTeacherId.value !== teacherId) return;
        teacherLessons.value = results.map((result) => {
          const master = lessons.value.find((l) => l._id === result._id);
          return master || result;
        });
      } catch (err) {
        if (selectedTeacherId.value !== teacherId) return;
        teacherLessonsError.value = err.message || 'Failed to load teacher lessons.';
      } finally {
        if (selectedTeacherId.value === teacherId) {
          teacherLessonsLoading.value = false;
        }
      }
    };

    const selectedTeacher = computed(() => {
      return teachers.value.find((t) => t._id === selectedTeacherId.value) || null;
    });

    const fetchEnrolment = async (lessonId) => {
      enrolmentByLesson.value = {
        ...enrolmentByLesson.value,
        [lessonId]: { loading: true, error: null, data: null }
      };

      try {
        const response = await fetch(`${API_BASE_URL}/enrolment/${encodeURIComponent(lessonId)}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || `Failed to load enrolment: ${response.status}`);
        }
        enrolmentByLesson.value = {
          ...enrolmentByLesson.value,
          [lessonId]: { loading: false, error: null, data: result }
        };
      } catch (err) {
        enrolmentByLesson.value = {
          ...enrolmentByLesson.value,
          [lessonId]: { loading: false, error: err.message || 'Failed to load enrolment.', data: null }
        };
      }
    };

    const refreshLoadedEnrolments = async (lessonIds) => {
      const uniqueIds = [...new Set(lessonIds)].filter((lessonId) =>
        Object.prototype.hasOwnProperty.call(enrolmentByLesson.value, lessonId)
      );
      if (uniqueIds.length === 0) return;
      await Promise.all(uniqueIds.map((lessonId) => fetchEnrolment(lessonId)));
    };

    const LESSON_IMAGE_FALLBACK =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Lesson image unavailable">' +
          '<rect width="400" height="300" fill="#edf2ed"/>' +
          '<rect x="148" y="88" width="104" height="82" rx="10" fill="#d8e4da" stroke="#3f6348" stroke-width="4"/>' +
          '<path d="M168 150l24-26 20 18 16-14 24 22z" fill="#3f6348"/>' +
          '<circle cx="178" cy="114" r="9" fill="#3f6348"/>' +
          '<text x="200" y="206" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#1e2421">Lesson image unavailable</text>' +
        '</svg>'
      );

    const TEACHER_IMAGE_FALLBACK =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Teacher avatar">' +
          '<rect width="160" height="160" fill="#edf2ed"/>' +
          '<circle cx="80" cy="60" r="28" fill="#3f6348"/>' +
          '<path d="M32 142c8-28 28-42 48-42s40 14 48 42z" fill="#3f6348"/>' +
        '</svg>'
      );

    const getLessonImageSrc = (lesson) => {
      const rawImage = lesson && typeof lesson.image === 'string' ? lesson.image.trim() : '';
      if (!rawImage) {
        return LESSON_IMAGE_FALLBACK;
      }
      // Normalize legacy .png extensions stored in lesson records to .jpg assets in frontend/images.
      const normalized = rawImage.replace(/\.png$/i, '.jpg');
      return `images/${normalized}`;
    };

    const getTeacherImageSrc = (teacher) => {
      const rawName = teacher && typeof teacher.name === 'string' ? teacher.name.trim() : '';
      if (!rawName) {
        return TEACHER_IMAGE_FALLBACK;
      }
      const firstName = rawName.split(/\s+/)[0].toLowerCase();
      if (!firstName) {
        return TEACHER_IMAGE_FALLBACK;
      }
      return `images/teachers/${encodeURIComponent(firstName)}.jpg`;
    };

    const applyImageFallback = (event, fallbackSrc) => {
      const img = event && event.target;
      if (!img) return;
      // Prevent repeated error events from looping if fallback assignment fails.
      if ((img.dataset && img.dataset.fallbackApplied === 'true') || img.src === fallbackSrc) {
        return;
      }
      if (img.dataset) {
        img.dataset.fallbackApplied = 'true';
      }
      img.src = fallbackSrc;
    };

    const onLessonImageError = (event) => {
      applyImageFallback(event, LESSON_IMAGE_FALLBACK);
    };

    const onTeacherImageError = (event) => {
      applyImageFallback(event, TEACHER_IMAGE_FALLBACK);
    };

    const addToCart = (lesson) => {
      if (lesson.space <= 0) return;

      if (orderConfirmed.value) {
        resetOrderState();
      }

      lesson.space -= 1;

      const existing = cart.value.find(item => item.lessonId === lesson._id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.value.push({
          lessonId: lesson._id,
          topic: lesson.topic,
          quantity: 1
        });
      }
    };

    const removeFromCart = (lessonId) => {
      const itemIndex = cart.value.findIndex(item => item.lessonId === lessonId);
      if (itemIndex === -1) return;

      const item = cart.value[itemIndex];
      item.quantity -= 1;

      if (item.quantity <= 0) {
        cart.value.splice(itemIndex, 1);
      }

      const lesson = lessons.value.find(l => l._id === lessonId);
      if (lesson) {
        lesson.space += 1;
      }
    };

    const cartCount = computed(() => {
      return cart.value.reduce((sum, item) => sum + item.quantity, 0);
    });

    const cartTotal = computed(() => {
      return cart.value.reduce((sum, item) => {
        const lesson = lessons.value.find(l => l._id === item.lessonId);
        return sum + (lesson ? lesson.price * item.quantity : 0);
      }, 0);
    });

    const sortCriteria = ref('');

    const displayedLessons = computed(() => {
      return searchResults.value !== null ? searchResults.value : lessons.value;
    });

    const sortedLessons = computed(() => {
      const source = displayedLessons.value;
      if (!sortCriteria.value) return source;

      const [criteria, direction] = sortCriteria.value.split(':');
      return [...source].sort((a, b) => {
        let valA, valB;
        if (criteria === 'price' || criteria === 'space') {
          valA = a[criteria];
          valB = b[criteria];
        } else {
          valA = String(a[criteria] || '').toLowerCase();
          valB = String(b[criteria] || '').toLowerCase();
        }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    });

    const NAME_REGEX = /^[a-zA-Z\s]+$/;
    const PHONE_REGEX = /^\d+$/;

    const isFieldValid = (value, pattern) => {
      const trimmed = value.trim();
      return trimmed.length > 0 && pattern.test(trimmed);
    };

    const isFormValid = computed(() => {
      return isFieldValid(customerName.value, NAME_REGEX) && isFieldValid(customerPhone.value, PHONE_REGEX);
    });

    const validateField = (inputRef, errorRef, pattern, emptyMessage, invalidMessage) => {
      const trimmed = inputRef.value.trim();
      if (!trimmed) {
        errorRef.value = emptyMessage;
        return false;
      }
      if (!pattern.test(trimmed)) {
        errorRef.value = invalidMessage;
        return false;
      }
      errorRef.value = null;
      return true;
    };

    const validateName = () => validateField(
      customerName,
      nameError,
      NAME_REGEX,
      'Customer name is required.',
      'Name must contain only letters and spaces.'
    );

    const validatePhone = () => validateField(
      customerPhone,
      phoneError,
      PHONE_REGEX,
      'Phone number is required.',
      'Phone must contain only digits.'
    );

    const onNameInput = () => {
      if (nameError.value) validateName();
    };

    const onPhoneInput = () => {
      if (phoneError.value) validatePhone();
    };

    const validateNameOnBlur = () => {
      validateName();
    };

    const validatePhoneOnBlur = () => {
      validatePhone();
    };

    const validateForm = () => {
      const nameValid = validateName();
      const phoneValid = validatePhone();
      return nameValid && phoneValid;
    };

    const prepareOrder = () => {
      if (cart.value.length === 0 || !validateForm()) return null;

      return {
        name: customerName.value.trim(),
        phone: customerPhone.value.trim(),
        items: cart.value.map(item => ({
          lessonId: item.lessonId,
          space: item.quantity
        }))
      };
    };

    const handleCheckout = async () => {
      const order = prepareOrder();
      if (!order) return;

      submitting.value = true;
      orderError.value = null;
      orderConfirmed.value = false;
      orderId.value = null;

      try {
        // Step 1: POST /orders
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(order)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Order failed: ${response.status}`);
        }

        const result = await response.json();
        if (!result || !result.order || !result.order._id) {
          throw new Error('Order response did not include an order ID.');
        }
        orderId.value = result.order._id;

        // Step 2: Confirm each lesson via PUT sequentially
        const failedItems = [];
        const confirmedLessonIds = [];

        for (const item of cart.value) {
          const lesson = lessons.value.find(l => l._id === item.lessonId);
          const newSpace = lesson ? lesson.space : null;

          if (newSpace === null) {
            failedItems.push({
              lessonId: item.lessonId,
              status: null,
              error: 'Lesson not found in local state.'
            });
            continue;
          }

          try {
            const putResponse = await fetch(`${API_BASE_URL}/lessons/${encodeURIComponent(item.lessonId)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                orderId: orderId.value,
                space: newSpace
              })
            });

            if (!putResponse.ok) {
              const errorData = await putResponse.json().catch(() => ({}));
              const message = errorData.message || errorData.error || 'No error message returned.';
              console.error('PUT confirmation failed', {
                orderId: orderId.value,
                lessonId: item.lessonId,
                status: putResponse.status,
                message
              });
              failedItems.push({
                lessonId: item.lessonId,
                status: putResponse.status,
                error: message
              });
              continue;
            }

            await putResponse.json().catch(() => ({}));
            confirmedLessonIds.push(item.lessonId);
          } catch (putErr) {
            const message = putErr && putErr.message ? putErr.message : 'Request failed.';
            console.error('PUT confirmation request failed', {
              orderId: orderId.value,
              lessonId: item.lessonId,
              status: null,
              message
            });
            failedItems.push({
              lessonId: item.lessonId,
              status: null,
              error: message
            });
          }
        }

        // Step 3: Handle results
        if (failedItems.length > 0) {
          const putFailureDetails = failedItems.map((f) => {
            const statusText = f.status != null ? ` (HTTP ${f.status})` : '';
            return `PUT /lessons/${f.lessonId} failed${statusText}: ${f.error}`;
          }).join('; ');

          // Cancel unconfirmed items via DELETE /orders/:orderId
          let cancellationMessage = '';
          try {
            const deleteResponse = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId.value)}`, {
              method: 'DELETE'
            });
            const deleteData = await deleteResponse.json().catch(() => ({}));
            if (!deleteResponse.ok) {
              const deleteError = deleteData.message || deleteData.error || 'No error message returned.';
              console.error('DELETE cancellation failed', {
                orderId: orderId.value,
                status: deleteResponse.status,
                message: deleteError
              });
              cancellationMessage = ` Cancellation failed (HTTP ${deleteResponse.status}): ${deleteError}; order ${orderId.value} may remain pending.`;
            }
          } catch (deleteErr) {
            const deleteError = deleteErr && deleteErr.message ? deleteErr.message : 'Request failed.';
            console.error('DELETE cancellation request failed', {
              orderId: orderId.value,
              status: null,
              message: deleteError
            });
            cancellationMessage = ` Cancellation request failed: ${deleteError}; order ${orderId.value} may remain pending.`;
          }

          const confirmedCount = confirmedLessonIds.length;
          if (confirmedCount > 0) {
            // Keep only failed items so a retry does not re-submit confirmed items.
            const failedIds = new Set(failedItems.map((f) => f.lessonId));
            cart.value = cart.value.filter((item) => failedIds.has(item.lessonId));
            await refreshLoadedEnrolments(confirmedLessonIds);
            orderError.value = `Order partially placed: ${confirmedCount} of ${confirmedCount + failedItems.length} items confirmed. ${putFailureDetails}.${cancellationMessage}`;
          } else {
            orderError.value = `Order could not be confirmed: ${putFailureDetails}.${cancellationMessage}`;
          }
        } else {
          // Order fully confirmed by the backend: reset the cart so the badge,
          // item list and totals return to their empty state. This only runs on
          // the all-confirmed path - failed orders keep the cart intact above.
          cart.value = [];
          await refreshLoadedEnrolments(confirmedLessonIds);
          orderConfirmed.value = true;
        }
      } catch (err) {
        orderError.value = err.message || 'Failed to place order. Please try again.';
      } finally {
        submitting.value = false;
      }
    };

    const resetOrderState = () => {
      orderConfirmed.value = false;
      orderId.value = null;
      customerName.value = '';
      customerPhone.value = '';
      nameError.value = null;
      phoneError.value = null;
      orderError.value = null;
    };

    const clearOrderConfirmation = () => {
      resetOrderState();
      view.value = 'lessons';
    };

    const closeCart = () => {
      if (view.value !== 'cart') return;
      if (orderConfirmed.value) {
        resetOrderState();
      }
      view.value = 'lessons';
    };

    const toggleCart = () => {
      if (view.value === 'cart') {
        closeCart();
        return;
      }
      if (orderConfirmed.value) {
        resetOrderState();
      }
      view.value = 'cart';
    };

    const scrollToLessons = () => {
      if (typeof document === 'undefined') return;
      const lessonsSection = document.getElementById('lessons-view');
      if (lessonsSection && typeof lessonsSection.scrollIntoView === 'function') {
        lessonsSection.scrollIntoView({ behavior: 'smooth' });
      }
    };

    const handleGlobalKeydown = (event) => {
      if (event && event.key === 'Escape' && view.value === 'cart') {
        closeCart();
      }
    };

    onMounted(() => {
      fetchLessons();
      fetchTeachers();
      if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('keydown', handleGlobalKeydown);
      }
    });

    if (typeof Vue.onUnmounted === 'function') {
      Vue.onUnmounted(() => {
        if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
          document.removeEventListener('keydown', handleGlobalKeydown);
        }
      });
    }

    return {
      lessons,
      error,
      loading,
      view,
      cart,
      cartCount,
      cartTotal,
      customerName,
      customerPhone,
      nameError,
      phoneError,
      orderError,
      orderId,
      orderConfirmed,
      submitting,
      searchQuery,
      searchResults,
      searchLoading,
      searchError,
      teachers,
      teachersLoading,
      teachersError,
      selectedTeacherId,
      selectedTeacher,
      teacherLessons,
      teacherLessonsLoading,
      teacherLessonsError,
      fetchTeacherLessons,
      enrolmentByLesson,
      fetchEnrolment,
      getLessonImageSrc,
      getTeacherImageSrc,
      onLessonImageError,
      onTeacherImageError,
      sortCriteria,
      sortedLessons,
      onSearchInput,
      addToCart,
      removeFromCart,
      closeCart,
      toggleCart,
      scrollToLessons,
      handleGlobalKeydown,
      isFormValid,
      onNameInput,
      onPhoneInput,
      validateName,
      validatePhone,
      validateNameOnBlur,
      validatePhoneOnBlur,
      validateForm,
      prepareOrder,
      handleCheckout,
      clearOrderConfirmation
    };
  }
});

app.mount('#app');
