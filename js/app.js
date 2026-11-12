const { createApp, ref, onMounted, computed } = Vue;

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
        const response = await fetch('http://localhost:3000/lessons');
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

    const onSearchInput = async () => {
      const q = searchQuery.value.trim();

      if (!q) {
        searchResults.value = null;
        searchError.value = null;
        searchLoading.value = false;
        return;
      }

      searchLoading.value = true;
      searchError.value = null;

      try {
        const response = await fetch(`http://localhost:3000/lessons/search?q=${encodeURIComponent(q)}`);
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
        searchError.value = err.message || 'Failed to search lessons.';
        searchResults.value = null;
      } finally {
        if (searchQuery.value.trim() === q) {
          searchLoading.value = false;
        }
      }
    };

    const fetchTeachers = async () => {
      teachersLoading.value = true;
      teachersError.value = null;
      try {
        const response = await fetch('http://localhost:3000/teachers');
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
      selectedTeacherId.value = teacherId;
      teacherLessons.value = [];
      teacherLessonsLoading.value = true;
      teacherLessonsError.value = null;

      try {
        const response = await fetch(`http://localhost:3000/teachers/${encodeURIComponent(teacherId)}/lessons`);
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
        const response = await fetch(`http://localhost:3000/enrolment/${encodeURIComponent(lessonId)}`);
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

    const addToCart = (lesson) => {
      if (lesson.space <= 0) return;

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

    const sortCriteria = ref(null);
    const sortDirection = ref('asc');

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

    const validateName = () => {
      const name = customerName.value.trim();
      if (!name) {
        nameError.value = 'Customer name is required.';
        return false;
      }
      if (!/^[a-zA-Z\s]+$/.test(name)) {
        nameError.value = 'Name must contain only letters and spaces.';
        return false;
      }
      nameError.value = null;
      return true;
    };

    const validatePhone = () => {
      const phone = customerPhone.value.trim();
      if (!phone) {
        phoneError.value = 'Phone number is required.';
        return false;
      }
      if (!/^\d+$/.test(phone)) {
        phoneError.value = 'Phone must contain only digits.';
        return false;
      }
      phoneError.value = null;
      return true;
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
      if (!validateForm()) return null;

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
        const response = await fetch('http://localhost:3000/orders', {
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
        orderId.value = result.order._id;

        // Step 2: Confirm each lesson via PUT sequentially
        const failedItems = [];

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

          const putResponse = await fetch(`http://localhost:3000/lessons/${item.lessonId}`, {
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
            const deleteResponse = await fetch(`http://localhost:3000/orders/${orderId.value}`, {
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

          const confirmedCount = cart.value.length - failedItems.length;
          orderError.value = `Order partially placed: ${confirmedCount} of ${cart.value.length} items confirmed. ${putFailureDetails}.${cancellationMessage}`;
        } else {
          // Order fully confirmed by the backend: reset the cart so the badge,
          // item list and totals return to their empty state. This only runs on
          // the all-confirmed path - failed orders keep the cart intact above.
          cart.value = [];
          orderConfirmed.value = true;
        }
      } catch (err) {
        orderError.value = err.message || 'Failed to place order. Please try again.';
      } finally {
        submitting.value = false;
      }
    };

    const clearOrderConfirmation = () => {
      orderConfirmed.value = false;
      orderId.value = null;
      customerName.value = '';
      customerPhone.value = '';
      nameError.value = null;
      phoneError.value = null;
      orderError.value = null;
    };

    const toggleCart = () => {
      view.value = view.value === 'lessons' ? 'cart' : 'lessons';
    };

    onMounted(() => {
      fetchLessons();
      fetchTeachers();
    });

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
      sortCriteria,
      sortedLessons,
      onSearchInput,
      addToCart,
      removeFromCart,
      toggleCart,
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
