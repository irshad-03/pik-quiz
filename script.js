// Add these variables at the top of your script
let firestoreListeners = [];

// Function to add a listener to the tracking array
function addFirestoreListener(listener) {
    firestoreListeners.push(listener);
}

// Function to remove all listeners
function removeAllFirestoreListeners() {
    firestoreListeners.forEach(listener => {
        if (listener) listener();
    });
    firestoreListeners = [];
}

// Call this when changing pages or when done with Firestore operations
function cleanupFirestore() {
    removeAllFirestoreListeners();
}

// Firebase configuration
const firebaseConfig = {
    apiKey: " ",
    authDomain: "pik-quiz-platform.firebaseapp.com",
    projectId: "pik-quiz-platform",
    storageBucket: "pik-quiz-platform.firebasestorage.app",
    messagingSenderId: "653739933838",
    appId: "1:653739933838:web:05aaf11b9a905c411149df"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence with error handling
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser doesn\'t support persistence');
        }
    });

// Add connection state monitoring
db.enableNetwork()
    .catch(() => {
        console.warn('Unable to enable network connectivity');
    });

// Global variables
let currentUser = null;
let questionCount = 1;
let currentQuizData = null;

// Student variables
let currentStudent = null;
let studentQuizData = null;
let studentAnswers = [];
let currentQuestionIndex = 0;
let quizTimer = null;
let timeRemaining = 0;

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize background animation
function initBackgroundAnimation() {
    const backgroundAnim = document.createElement('div');
    backgroundAnim.className = 'background-animation';

    for (let i = 0; i < 8; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        backgroundAnim.appendChild(bubble);
    }

    document.body.appendChild(backgroundAnim);
}

// Page Navigation
document.querySelectorAll('.nav-link').forEach(element => {
    element.addEventListener('click', function (e) {
        e.preventDefault();
        const page = this.getAttribute('data-page');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // Show the selected page
        document.getElementById(`${page}-page`).classList.add('active');

        // If student page is selected and student is logged in, show dashboard
        if (page === 'student' && currentStudent) {
            showStudentDashboard();
        }

        // If teacher page is selected and teacher is logged in, show dashboard
        if (page === 'teacher' && currentUser) {
            showTeacherDashboard();
        }
    });
});

// Teacher login buttons
document.getElementById('header-teacher-login').addEventListener('click', function () {
    navigateToPage('teacher');
});

document.getElementById('teacher-login-btn').addEventListener('click', function () {
    navigateToPage('teacher');
});

// Student login buttons
document.getElementById('header-student-login').addEventListener('click', function () {
    navigateToPage('student');
});

document.getElementById('student-login-btn').addEventListener('click', function () {
    navigateToPage('student');
});

// Teacher register button
document.getElementById('teacher-register-btn').addEventListener('click', function () {
    navigateToPage('teacher');

    // Show registration form
    setTimeout(() => {
        document.getElementById('toggle-teacher-register').click();
    }, 100);
});

// Student register button
document.getElementById('student-register-btn').addEventListener('click', function () {
    navigateToPage('student');

    // Show registration form
    setTimeout(() => {
        document.getElementById('toggle-student-register').click();
    }, 100);
});

// Toggle between teacher login and registration
document.getElementById('toggle-teacher-register').addEventListener('click', function () {
    const nameField = document.getElementById('teacher-name-field');
    const loginBtn = document.querySelector('#teacher-auth-form .btn-teacher');

    if (this.textContent === 'NEW REGISTRATION') {
        nameField.style.display = 'block';
        loginBtn.textContent = 'REGISTER';
        this.textContent = 'BACK TO LOGIN';
    } else {
        nameField.style.display = 'none';
        loginBtn.textContent = 'LOGIN';
        this.textContent = 'NEW REGISTRATION';
    }
});

// Toggle between student login and registration
document.getElementById('toggle-student-register').addEventListener('click', function () {
    const regNoField = document.getElementById('student-reg-no-field');
    const nameField = document.getElementById('student-name-field');
    const loginBtn = document.querySelector('#student-auth-form .btn-student');

    if (this.textContent === 'NEW REGISTRATION') {
        regNoField.style.display = 'block';
        nameField.style.display = 'block';
        loginBtn.textContent = 'REGISTER';
        this.textContent = 'BACK TO LOGIN';
    } else {
        regNoField.style.display = 'none';
        nameField.style.display = 'none';
        loginBtn.textContent = 'LOGIN';
        this.textContent = 'NEW REGISTRATION';
    }
});

// Teacher form submission with Firebase integration
document.getElementById('teacher-auth-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('teacher-email').value;
    const password = document.getElementById('teacher-password').value;
    const name = document.getElementById('teacher-name').value;
    const isRegistration = document.getElementById('toggle-teacher-register').textContent === 'BACK TO LOGIN';

    if (isRegistration) {
        // Register teacher
        if (!name) {
            showToast('Please enter your name', 'error');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Add teacher to Firestore
                return db.collection('teachers').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                showToast('Registration successful!');
                // Reset form
                document.getElementById('teacher-auth-form').reset();
                // Switch back to login view
                document.getElementById('toggle-teacher-register').click();
            })
            .catch((error) => {
                showToast(error.message, 'error');
            });
    } else {
        // Login teacher
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showToast('Login successful!');
                currentUser = userCredential.user;
                // Update UI for logged in teacher
                showTeacherDashboard();
            })
            .catch((error) => {
                showToast(error.message, 'error');
            });
    }
});

// Student form submission with Firebase integration
document.getElementById('student-auth-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = document.getElementById('student-email').value;
    const password = document.getElementById('student-password').value;
    const regNo = document.getElementById('student-reg-no').value;
    const name = document.getElementById('student-name').value;
    const isRegistration = document.getElementById('toggle-student-register').textContent === 'BACK TO LOGIN';

    if (isRegistration) {
        // Register student
        if (!regNo || !name) {
            showToast('Please enter registration number and name', 'error');
            return;
        }

        // Create student with email and password
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Add student to Firestore
                return db.collection('students').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    regNo: regNo,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                showToast('Registration successful!');
                // Reset form
                document.getElementById('student-auth-form').reset();
                // Switch back to login view
                document.getElementById('toggle-student-register').click();
            })
            .catch((error) => {
                // Firebase will now handle all registration-related errors
                showToast(error.message, 'error');
            });
    } else {
        // Login student
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Get student data from Firestore
                return db.collection('students').doc(userCredential.user.uid).get();
            })
            .then((doc) => {
                if (doc.exists) {
                    showToast('Login successful!');
                    currentStudent = {
                        uid: doc.id,
                        name: doc.data().name,
                        email: doc.data().email,
                        regNo: doc.data().regNo
                    };

                    // Store in sessionStorage
                    sessionStorage.setItem('currentStudent', JSON.stringify(currentStudent));

                    // Update UI for logged in student
                    showStudentDashboard();
                } else {
                    showToast('Student data not found', 'error');
                }
            })
            .catch((error) => {
                showToast(error.message, 'error');
            });
    }
});

// Show teacher dashboard after login
function showTeacherDashboard() {
    document.getElementById('teacher-auth-container').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
    document.getElementById('header-teacher-login').style.display = 'none';
    document.getElementById('header-student-login').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'block';

    // Get teacher name
    db.collection('teachers').doc(currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                document.getElementById('teacher-display-name').textContent = doc.data().name;
                document.getElementById('edit-teacher-name').value = doc.data().name;
                document.getElementById('edit-teacher-email').value = doc.data().email;
            } else {
                document.getElementById('teacher-display-name').textContent = currentUser.email;
            }
        })
        .catch((error) => {
            console.error("Error getting teacher document:", error);
            document.getElementById('teacher-display-name').textContent = currentUser.email;
        });
}

// Show student dashboard after login
function showStudentDashboard() {
    document.getElementById('student-auth-container').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'block';
    document.getElementById('header-teacher-login').style.display = 'none';
    document.getElementById('header-student-login').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'block';

    // Display student name
    document.getElementById('student-display-name').textContent = currentStudent.name;

    // Pre-fill the account form
    document.getElementById('edit-student-name').value = currentStudent.name;
    document.getElementById('edit-student-email').value = currentStudent.email;
    document.getElementById('edit-student-reg-no').value = currentStudent.regNo;
}

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', function () {
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully');
            currentUser = null;
            currentStudent = null;

            // Reset teacher UI
            document.getElementById('teacher-auth-container').style.display = 'block';
            document.getElementById('teacher-dashboard').style.display = 'none';
            document.getElementById('create-quiz-section').style.display = 'none';
            document.getElementById('manage-quiz-section').style.display = 'none';
            document.getElementById('view-scores-section').style.display = 'none';
            document.getElementById('manage-teacher-account-section').style.display = 'none';

            // Reset student UI
            document.getElementById('student-auth-container').style.display = 'block';
            document.getElementById('student-dashboard').style.display = 'none';
            document.getElementById('student-form-container').style.display = 'none';
            document.getElementById('quiz-taking-section').style.display = 'none';
            document.getElementById('quiz-results-section').style.display = 'none';
            document.getElementById('student-attempts-section').style.display = 'none';
            document.getElementById('manage-student-account-section').style.display = 'none';

            // Reset header buttons
            document.getElementById('header-teacher-login').style.display = 'block';
            document.getElementById('header-student-login').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';

            // Clear session storage
            sessionStorage.removeItem('currentStudent');

            // Clean up Firestore listeners
            cleanupFirestore();
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
});

// Dashboard navigation for teachers
document.getElementById('create-quiz-btn').addEventListener('click', function () {
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('create-quiz-section').style.display = 'block';
});

document.getElementById('manage-quiz-btn').addEventListener('click', function () {
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('manage-quiz-section').style.display = 'block';
    loadQuizzes();
});

document.getElementById('view-scores-btn').addEventListener('click', function () {
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('view-scores-section').style.display = 'block';
    loadQuizzesForScores();
});

document.getElementById('manage-teacher-account-btn').addEventListener('click', function () {
    document.getElementById('teacher-dashboard').style.display = 'none';
    document.getElementById('manage-teacher-account-section').style.display = 'block';
});

// Dashboard navigation for students
document.getElementById('take-quiz-btn').addEventListener('click', function () {
    document.getElementById('student-dashboard').style.display = 'none';
    document.getElementById('student-form-container').style.display = 'block';
});

document.getElementById('view-attempts-btn').addEventListener('click', function () {
    document.getElementById('student-dashboard').style.display = 'none';
    document.getElementById('student-attempts-section').style.display = 'block';
    loadStudentAttempts();
});

document.getElementById('manage-student-account-btn').addEventListener('click', function () {
    document.getElementById('student-dashboard').style.display = 'none';
    document.getElementById('manage-student-account-section').style.display = 'block';
});

// Back to dashboard buttons for teachers
document.getElementById('back-to-dashboard').addEventListener('click', function () {
    document.getElementById('create-quiz-section').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
});

document.getElementById('back-to-dashboard-2').addEventListener('click', function () {
    document.getElementById('manage-quiz-section').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
});

document.getElementById('back-to-dashboard-3').addEventListener('click', function () {
    document.getElementById('view-scores-section').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
});

document.getElementById('back-to-dashboard-from-teacher-account').addEventListener('click', function () {
    document.getElementById('manage-teacher-account-section').style.display = 'none';
    document.getElementById('teacher-dashboard').style.display = 'block';
});

// Back to dashboard buttons for students
document.getElementById('back-to-student-dashboard').addEventListener('click', function () {
    document.getElementById('student-form-container').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'block';
});

document.getElementById('back-to-student-dashboard-from-attempts').addEventListener('click', function () {
    document.getElementById('student-attempts-section').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'block';
});

document.getElementById('back-to-student-dashboard-from-account').addEventListener('click', function () {
    document.getElementById('manage-student-account-section').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'block';
});

// Update teacher account
document.getElementById('teacher-account-form').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please log in first', 'error');
        return;
    }

    const name = document.getElementById('edit-teacher-name').value;
    const email = document.getElementById('edit-teacher-email').value;
    const password = document.getElementById('edit-teacher-password').value;

    // Update email if changed
    if (email !== currentUser.email) {
        currentUser.updateEmail(email)
            .then(() => {
                showToast('Email updated successfully');
            })
            .catch((error) => {
                showToast('Error updating email: ' + error.message, 'error');
                return;
            });
    }

    // Update password if provided
    if (password) {
        currentUser.updatePassword(password)
            .then(() => {
                showToast('Password updated successfully');
            })
            .catch((error) => {
                showToast('Error updating password: ' + error.message, 'error');
                return;
            });
    }

    // Update name in Firestore
    db.collection('teachers').doc(currentUser.uid).update({
        name: name,
        email: email
    })
        .then(() => {
            showToast('Profile updated successfully');
            document.getElementById('teacher-display-name').textContent = name;
        })
        .catch((error) => {
            showToast('Error updating profile: ' + error.message, 'error');
        });
});

// Delete teacher account
document.getElementById('delete-teacher-account-btn').addEventListener('click', function () {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will delete all your quizzes and associated data.')) {
        return;
    }

    const user = auth.currentUser;

    // First, delete all quizzes created by this teacher
    db.collection('quizzes').where('createdBy', '==', user.uid).get()
        .then((querySnapshot) => {
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                // Delete all scores for each quiz first
                const deleteScores = db.collection('scores').where('quizId', '==', doc.id).get()
                    .then((scoreSnapshot) => {
                        const scoreDeletePromises = [];
                        scoreSnapshot.forEach((scoreDoc) => {
                            scoreDeletePromises.push(scoreDoc.ref.delete());
                        });
                        return Promise.all(scoreDeletePromises);
                    })
                    .then(() => {
                        // Then delete the quiz
                        return doc.ref.delete();
                    });
                deletePromises.push(deleteScores);
            });
            return Promise.all(deletePromises);
        })
        .then(() => {
            // Delete the teacher document
            return db.collection('teachers').doc(user.uid).delete();
        })
        .then(() => {
            // Delete the user account
            return user.delete();
        })
        .then(() => {
            showToast('Account deleted successfully');
            // The user will be automatically signed out after account deletion
            document.getElementById('logout-btn').click();
        })
        .catch((error) => {
            showToast('Error deleting account: ' + error.message, 'error');
        });
});

// Update student account
document.getElementById('student-account-form').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!currentStudent) {
        showToast('Please log in first', 'error');
        return;
    }

    const name = document.getElementById('edit-student-name').value;
    const email = document.getElementById('edit-student-email').value;
    const regNo = document.getElementById('edit-student-reg-no').value;
    const password = document.getElementById('edit-student-password').value;

    // Update email if changed
    if (email !== currentStudent.email) {
        const user = auth.currentUser;
        user.updateEmail(email)
            .then(() => {
                showToast('Email updated successfully');
            })
            .catch((error) => {
                showToast('Error updating email: ' + error.message, 'error');
                return;
            });
    }

    // Update password if provided
    if (password) {
        const user = auth.currentUser;
        user.updatePassword(password)
            .then(() => {
                showToast('Password updated successfully');
            })
            .catch((error) => {
                showToast('Error updating password: ' + error.message, 'error');
                return;
            });
    }

    // Update student data in Firestore
    db.collection('students').doc(currentStudent.uid).update({
        name: name,
        email: email,
        regNo: regNo
    })
        .then(() => {
            showToast('Profile updated successfully');
            currentStudent.name = name;
            currentStudent.email = email;
            currentStudent.regNo = regNo;
            document.getElementById('student-display-name').textContent = name;

            // Update session storage
            sessionStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        })
        .catch((error) => {
            showToast('Error updating profile: ' + error.message, 'error');
        });
});

// Delete student account
document.getElementById('delete-student-account-btn').addEventListener('click', function () {
    if (!confirm('Are you sure you want to delete your account? This will permanently remove all your data, including quiz attempts.')) {
        return;
    }

    if (!currentStudent) return;

    const user = auth.currentUser;

    // First delete all attempts by this student
    db.collection('scores')
        .where('studentUid', '==', currentStudent.uid)
        .get()
        .then((querySnapshot) => {
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(doc.ref.delete());
            });
            return Promise.all(deletePromises);
        })
        .then(() => {
            // Then delete the student document
            return db.collection('students').doc(currentStudent.uid).delete();
        })
        .then(() => {
            // Delete the user account
            return user.delete();
        })
        .then(() => {
            showToast('Account deleted successfully');
            currentStudent = null;
            sessionStorage.removeItem('currentStudent');

            // Return to student login
            document.getElementById('manage-student-account-section').style.display = 'none';
            document.getElementById('student-auth-container').style.display = 'block';
            document.getElementById('student-auth-form').reset();
            document.getElementById('toggle-student-register').textContent = 'NEW REGISTRATION';
            document.getElementById('student-reg-no-field').style.display = 'none';
            document.getElementById('student-name-field').style.display = 'none';
            document.querySelector('#student-auth-form .btn-student').textContent = 'LOGIN';
        })
        .catch((error) => {
            showToast('Error deleting account: ' + error.message, 'error');
        });
});

// Add question functionality
document.getElementById('add-question-btn').addEventListener('click', function () {
    questionCount++;
    const newQuestion = document.createElement('div');
    newQuestion.className = 'question-container';
    newQuestion.setAttribute('data-question-id', questionCount);
    newQuestion.innerHTML = `
        <div class="form-group">
            <label>Question ${questionCount}:</label>
            <input type="text" class="form-control question-text" placeholder="Enter question" required>
        </div>
        
        <div class="form-group">
            <label>Options:</label>
            <div class="option-row">
                <input type="text" class="form-control option-text" placeholder="Option 1" required>
                <input type="radio" name="correct-answer-${questionCount}" value="0" required> Correct
            </div>
            <div class="option-row">
                <input type="text" class="form-control option-text" placeholder="Option 2" required>
                <input type="radio" name="correct-answer-${questionCount}" value="1" required> Correct
            </div>
            <div class="option-row">
                <input type="text" class="form-control option-text" placeholder="Option 3">
                <input type="radio" name="correct-answer-${questionCount}" value="2"> Correct
            </div>
            <div class="option-row">
                <input type="text" class="form-control option-text" placeholder="Option 4">
                <input type="radio" name="correct-answer-${questionCount}" value="3"> Correct
            </div>
        </div>
        
        <div class="form-group">
            <label>Explanation:</label>
            <textarea class="form-control explanation" placeholder="Explanation for the correct answer" rows="3" required></textarea>
        </div>
        
        <button type="button" class="btn btn-danger remove-question">Remove Question</button>
    `;

    document.getElementById('questions-container').appendChild(newQuestion);

    // Add event listener to remove button
    newQuestion.querySelector('.remove-question').addEventListener('click', function () {
        this.parentElement.remove();
        // Renumber questions
        const questions = document.querySelectorAll('.question-container');
        questions.forEach((question, index) => {
            question.setAttribute('data-question-id', index + 1);
            question.querySelector('label').textContent = `Question ${index + 1}:`;
            // Update radio button names
            const radios = question.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.name = `correct-answer-${index + 1}`;
            });
        });
        questionCount = questions.length;
    });
});

// Create quiz form submission - FIXED FIREBASE ERROR
document.getElementById('quiz-form').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Please log in first', 'error');
        return;
    }

    const subject = document.getElementById('quiz-subject').value;
    const timeLimit = document.getElementById('quiz-time-limit').value;
    const expiry = document.getElementById('quiz-expiry').value;

    // Collect questions
    const questions = [];
    const questionContainers = document.querySelectorAll('.question-container');

    let isValid = true;

    questionContainers.forEach((container, index) => {
        const questionText = container.querySelector('.question-text').value;
        const options = Array.from(container.querySelectorAll('.option-text'))
            .map(input => input.value)
            .filter(value => value.trim() !== '');

        const correctAnswer = container.querySelector('input[type="radio"]:checked');
        const explanation = container.querySelector('.explanation').value;

        if (!correctAnswer) {
            showToast(`Please select a correct answer for question ${index + 1}`, 'error');
            isValid = false;
            return;
        }

        questions.push({
            question: questionText,
            options: options,
            correctAnswer: parseInt(correctAnswer.value),
            explanation: explanation
        });
    });

    if (!isValid) return;

    // Generate a unique exam code
    const examCode = generateExamCode();

    // Convert expiry date to Firestore Timestamp
    const expiryTimestamp = firebase.firestore.Timestamp.fromDate(new Date(expiry));

    // Save to Firestore
    db.collection('quizzes').add({
        subject: subject,
        timeLimit: parseInt(timeLimit),
        expiry: expiryTimestamp,
        questions: questions,
        createdBy: currentUser.uid,
        examCode: examCode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
        .then((docRef) => {
            showToast(`Quiz created successfully! Exam Code: ${examCode}`);
            document.getElementById('quiz-form').reset();
            // Reset to first question only
            const questionsContainer = document.getElementById('questions-container');
            questionsContainer.innerHTML = '';
            questionCount = 1;
            questionsContainer.innerHTML = `
            <div class="question-container" data-question-id="1">
                <div class="form-group">
                    <label>Question 1:</label>
                    <input type="text" class="form-control question-text" placeholder="Enter question" required>
                </div>
                
                <div class="form-group">
                    <label>Options:</label>
                    <div class="option-row">
                        <input type="text" class="form-control option-text" placeholder="Option 1" required>
                        <input type="radio" name="correct-answer-1" value="0" required> Correct
                    </div>
                    <div class="option-row">
                        <input type="text" class="form-control option-text" placeholder="Option 2" required>
                        <input type="radio" name="correct-answer-1" value="1" required> Correct
                    </div>
                    <div class="option-row">
                        <input type="text" class="form-control option-text" placeholder="Option 3">
                        <input type="radio" name="correct-answer-1" value="2"> Correct
                    </div>
                    <div class="option-row">
                        <input type="text" class="form-control option-text" placeholder="Option 4">
                        <input type="radio" name="correct-answer-1" value="3"> Correct
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Explanation:</label>
                    <textarea class="form-control explanation" placeholder="Explanation for the correct answer" rows="3" required></textarea>
                </div>
                
                <button type="button" class="btn btn-danger remove-question" style="display: none;">Remove Question</button>
            </div>
        `;

            // Go back to dashboard
            document.getElementById('create-quiz-section').style.display = 'none';
            document.getElementById('teacher-dashboard').style.display = 'block';
        })
        .catch((error) => {
            console.error("Error creating quiz:", error);
            showToast('Error creating quiz: ' + error.message, 'error');
        });
});

// Generate exam code
function generateExamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Load quizzes for management
function loadQuizzes() {
    if (!currentUser) return;

    const quizzesList = document.getElementById('quizzes-list');
    quizzesList.innerHTML = '<p class="text-center">Loading quizzes...</p>';

    // Use the listener tracking
    const listener = db.collection('quizzes')
        .where('createdBy', '==', currentUser.uid)
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                quizzesList.innerHTML = '<p class="text-center">No quizzes found. Create your first quiz!</p>';
                return;
            }

            quizzesList.innerHTML = '';
            const quizListContainer = document.createElement('div');
            quizListContainer.className = 'quiz-list';

            querySnapshot.forEach((doc) => {
                const quiz = doc.data();
                const quizItem = document.createElement('div');
                quizItem.className = 'quiz-item';

                // Handle both Timestamp and Date objects for expiry
                let expiryDate;
                if (quiz.expiry && quiz.expiry.toDate) {
                    expiryDate = quiz.expiry.toDate();
                } else {
                    expiryDate = new Date(quiz.expiry);
                }

                const now = new Date();
                const isExpired = expiryDate < now;

                quizItem.innerHTML = `
                    <h3>${quiz.subject}</h3>
                    <p><strong>Exam Code:</strong> ${quiz.examCode}</p>
                    <p><strong>Time Limit:</strong> ${quiz.timeLimit} minutes</p>
                    <p><strong>Expires:</strong> ${expiryDate.toLocaleString()}</p>
                    <p><strong>Status:</strong> ${isExpired ? '<span style="color: red;">Expired</span>' : '<span style="color: green;">Active</span>'}</p>
                    <p><strong>Questions:</strong> ${quiz.questions.length}</p>
                    <div class="quiz-actions">
                        <button class="btn btn-danger delete-quiz" data-id="${doc.id}">Delete Quiz</button>
                    </div>
                `;

                quizListContainer.appendChild(quizItem);
            });

            quizzesList.appendChild(quizListContainer);

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-quiz').forEach(button => {
                button.addEventListener('click', function () {
                    const quizId = this.getAttribute('data-id');
                    deleteQuiz(quizId);
                });
            });
        }, (error) => {
            console.error("Error loading quizzes:", error);
            quizzesList.innerHTML = '<p class="text-center">Error loading quizzes: ' + error.message + '</p>';
        });

    addFirestoreListener(listener);
}

// Delete quiz
function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz? This will also delete all associated student scores.')) {
        return;
    }

    // First delete all scores for this quiz
    db.collection('scores')
        .where('quizId', '==', quizId)
        .get()
        .then((querySnapshot) => {
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(doc.ref.delete());
            });

            return Promise.all(deletePromises);
        })
        .then(() => {
            // Then delete the quiz itself
            return db.collection('quizzes').doc(quizId).delete();
        })
        .then(() => {
            showToast('Quiz and associated scores deleted successfully');
            loadQuizzes(); // Reload the list
        })
        .catch((error) => {
            console.error('Full error details:', error);
            showToast('Error deleting quiz: ' + error.message, 'error');

            // Check if it's a permission error
            if (error.code === 'permission-denied') {
                showToast('You do not have permission to delete this quiz', 'error');
            }
        });
}

// Load quizzes for scores dropdown
function loadQuizzesForScores() {
    if (!currentUser) return;

    const quizSelect = document.getElementById('quiz-select');
    quizSelect.innerHTML = '<option value="">Loading quizzes...</option>';

    // Use listener tracking
    const listener = db.collection('quizzes')
        .where('createdBy', '==', currentUser.uid)
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                quizSelect.innerHTML = '<option value="">No quizzes found</option>';
                return;
            }

            quizSelect.innerHTML = '<option value="">Select a quiz</option>';
            querySnapshot.forEach((doc) => {
                const quiz = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${quiz.subject} (${quiz.examCode})`;
                option.setAttribute('data-quiz', JSON.stringify({
                    ...quiz,
                    // Convert Timestamp to string for JSON serialization
                    expiry: quiz.expiry && quiz.expiry.toDate ? quiz.expiry.toDate().toISOString() : quiz.expiry
                }));
                quizSelect.appendChild(option);
            });

            // Add event listener to load scores when quiz is selected
            quizSelect.addEventListener('change', function () {
                if (this.value) {
                    const selectedOption = this.options[this.selectedIndex];
                    const quizData = JSON.parse(selectedOption.getAttribute('data-quiz'));
                    // Convert expiry string back to Date object
                    currentQuizData = {
                        ...quizData,
                        expiry: new Date(quizData.expiry)
                    };
                    loadScores(this.value);
                } else {
                    document.getElementById('scores-container').innerHTML = '<p class="text-center">Select a quiz to view scores</p>';
                }
            });
        }, (error) => {
            console.error("Error loading quizzes:", error);
            quizSelect.innerHTML = '<option value="">Error loading quizzes</option>';
        });

    addFirestoreListener(listener);
}

// Load scores for selected quiz
function loadScores(quizId) {
    const scoresContainer = document.getElementById('scores-container');
    scoresContainer.innerHTML = '<p class="text-center">Loading scores...</p>';

    // Use listener tracking
    const listener = db.collection('scores')
        .where('quizId', '==', quizId)
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                scoresContainer.innerHTML = '<p class="text-center">No scores found for this quiz</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'scores-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Registration No</th>
                        <th>Score</th>
                        <th>Attempted At</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;

            const tbody = table.querySelector('tbody');

            querySnapshot.forEach((doc) => {
                const scoreData = doc.data();
                const row = document.createElement('tr');

                // Handle both Timestamp and Date objects for attemptedAt
                let attemptedAt;
                if (scoreData.attemptedAt && scoreData.attemptedAt.toDate) {
                    attemptedAt = scoreData.attemptedAt.toDate();
                } else {
                    attemptedAt = new Date(scoreData.attemptedAt);
                }

                row.innerHTML = `
                    <td>${scoreData.studentName}</td>
                    <td>${scoreData.studentRegNo}</td>
                    <td>${scoreData.score} / ${scoreData.totalQuestions}</td>
                    <td>${attemptedAt.toLocaleString()}</td>
                `;

                tbody.appendChild(row);
            });

            scoresContainer.innerHTML = '';
            scoresContainer.appendChild(table);
        }, (error) => {
            console.error("Error loading scores:", error);
            scoresContainer.innerHTML = '<p class="text-center">Error loading scores: ' + error.message + '</p>';
        });

    addFirestoreListener(listener);
}

// Download PDF functionality for teachers
document.getElementById('download-pdf').addEventListener('click', function () {
    if (!currentQuizData) {
        showToast('Please select a quiz first', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('PIK_QUIZ - Exam Results Report', 105, 20, { align: 'center' });

    // Add exam details
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`Subject: ${currentQuizData.subject}`, 20, 35);
    doc.text(`Exam Code: ${currentQuizData.examCode}`, 20, 45);

    const expiryDate = currentQuizData.expiry;
    doc.text(`Expiry Date: ${expiryDate.toLocaleDateString()}`, 20, 55);
    doc.text(`Time Limit: ${currentQuizData.timeLimit} minutes`, 20, 65);

    // Get scores data for the table
    db.collection('scores')
        .where('quizId', '==', document.getElementById('quiz-select').value)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                doc.text('No scores available for this quiz', 20, 80);
                doc.save(`${currentQuizData.subject}_Scores_Report.pdf`);
                showToast('PDF generated with no scores data');
                return;
            }

            const headers = [['Student Name', 'Registration No', 'Score', 'Attempted At']];
            const data = [];

            querySnapshot.forEach((doc) => {
                const scoreData = doc.data();
                // Handle both Timestamp and Date objects for attemptedAt
                let attemptedAt;
                if (scoreData.attemptedAt && scoreData.attemptedAt.toDate) {
                    attemptedAt = scoreData.attemptedAt.toDate();
                } else {
                    attemptedAt = new Date(scoreData.attemptedAt);
                }

                data.push([
                    scoreData.studentName,
                    scoreData.studentRegNo,
                    `${scoreData.score} / ${scoreData.totalQuestions}`,
                    attemptedAt.toLocaleDateString()
                ]);
            });

            // Add table to PDF
            doc.autoTable({
                head: headers,
                body: data,
                startY: 75,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [67, 97, 238] }
            });

            // Add generated date footer
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 105, finalY, { align: 'center' });

            // Save the PDF
            doc.save(`${currentQuizData.subject}_Scores_Report.pdf`);
            showToast('PDF report downloaded successfully');
        })
        .catch((error) => {
            showToast('Error generating PDF: ' + error.message, 'error');
        });
});

// Load student attempts
function loadStudentAttempts() {
    if (!currentStudent) return;

    const attemptsList = document.getElementById('attempts-list');
    attemptsList.innerHTML = '<p class="text-center">Loading your attempts...</p>';

    // Use listener tracking
    const listener = db.collection('scores')
        .where('studentUid', '==', currentStudent.uid)
        .orderBy('attemptedAt', 'desc')
        .onSnapshot((querySnapshot) => {
            if (querySnapshot.empty) {
                attemptsList.innerHTML = '<p class="text-center">No quiz attempts found.</p>';
                return;
            }

            attemptsList.innerHTML = '';

            querySnapshot.forEach((doc) => {
                const attempt = doc.data();
                const attemptItem = document.createElement('div');
                attemptItem.className = 'attempt-item';

                // Handle both Timestamp and Date objects for attemptedAt
                let attemptedAt;
                if (attempt.attemptedAt && attempt.attemptedAt.toDate) {
                    attemptedAt = attempt.attemptedAt.toDate();
                } else {
                    attemptedAt = new Date(attempt.attemptedAt);
                }

                attemptItem.innerHTML = `
                    <div class="attempt-header">
                        <h3>${attempt.quizSubject || 'Quiz'}</h3>
                        <span>${attemptedAt.toLocaleString()}</span>
                    </div>
                    <div class="attempt-details">
                        <div><strong>Score:</strong> ${attempt.score} / ${attempt.totalQuestions}</div>
                        <div><strong>Exam Code:</strong> ${attempt.examCode || 'N/A'}</div>
                    </div>
                    <button class="download-btn" data-id="${doc.id}">
                        <i class="fas fa-download"></i> Download Explanation
                    </button>
                `;

                attemptsList.appendChild(attemptItem);

                // Add event listener to download button
                attemptItem.querySelector('.download-btn').addEventListener('click', function () {
                    downloadAttemptExplanation(doc.id, attempt);
                });
            });
        }, (error) => {
            console.error("Error loading attempts:", error);
            attemptsList.innerHTML = '<p class="text-center">Error loading attempts: ' + error.message + '</p>';
        });

    addFirestoreListener(listener);
}

// Download attempt explanation
function downloadAttemptExplanation(attemptId, attemptData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('PIK_QUIZ - Attempt Explanation', 105, 20, { align: 'center' });

    // Add attempt details
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`Subject: ${attemptData.quizSubject || 'Quiz'}`, 20, 35);
    doc.text(`Exam Code: ${attemptData.examCode || 'N/A'}`, 20, 45);
    doc.text(`Student: ${attemptData.studentName}`, 20, 55);
    doc.text(`Registration No: ${attemptData.studentRegNo}`, 20, 65);
    doc.text(`Score: ${attemptData.score} / ${attemptData.totalQuestions}`, 20, 75);

    // Handle both Timestamp and Date objects for attemptedAt
    let attemptedAt;
    if (attemptData.attemptedAt && attemptData.attemptedAt.toDate) {
        attemptedAt = attemptData.attemptedAt.toDate();
    } else {
        attemptedAt = new Date(attemptData.attemptedAt);
    }

    doc.text(`Attempted At: ${attemptedAt.toLocaleString()}`, 20, 85);

    // Check if we have question details to include
    if (attemptData.questions && attemptData.questions.length > 0) {
        doc.text('Question Review:', 20, 100);

        let yPosition = 110;
        attemptData.questions.forEach((question, index) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Q${index + 1}: ${question.question}`, 20, yPosition);
            yPosition += 10;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Your Answer: ${question.userAnswer !== undefined ? question.options[question.userAnswer] : 'Not answered'}`, 25, yPosition);
            yPosition += 7;

            doc.setTextColor(0, 128, 0);
            doc.text(`Correct Answer: ${question.options[question.correctAnswer]}`, 25, yPosition);
            yPosition += 7;

            doc.setTextColor(0, 0, 0);
            doc.text(`Explanation: ${question.explanation}`, 25, yPosition);
            yPosition += 15;
        });
    } else {
        doc.text('Detailed question data not available for this attempt.', 20, 100);
    }

    // Add generated date footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 105, 280, { align: 'center' });

    // Save the PDF
    doc.save(`${attemptData.quizSubject || 'Quiz'}_Explanation.pdf`);
    showToast('Explanation downloaded successfully');
}

// Student quiz start
document.getElementById('start-quiz-btn').addEventListener('click', function () {
    if (!currentStudent) {
        // Show login form if not authenticated
        document.getElementById('student-form-container').style.display = 'none';
        document.getElementById('student-auth-container').style.display = 'block';
        showToast('Please login first', 'error');
        return;
    }

    const examCode = document.getElementById('exam-code').value;

    if (!examCode) {
        showToast('Please enter exam code', 'error');
        return;
    }

    // Check if exam exists
    db.collection('quizzes').where('examCode', '==', examCode).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                showToast('Exam code not found', 'error');
                return;
            }

            const quizDoc = querySnapshot.docs[0];
            const quiz = quizDoc.data();

            // Check if exam has expired
            // Handle both Timestamp and Date objects for expiry
            let expiryDate;
            if (quiz.expiry && quiz.expiry.toDate) {
                expiryDate = quiz.expiry.toDate();
            } else {
                expiryDate = new Date(quiz.expiry);
            }

            const now = new Date();

            if (expiryDate < now) {
                showToast('This exam has expired', 'error');
                return;
            }

            // Check if student has already taken this quiz
            return db.collection('scores')
                .where('quizId', '==', quizDoc.id)
                .where('studentUid', '==', currentStudent.uid)
                .get()
                .then((scoreSnapshot) => {
                    if (!scoreSnapshot.empty) {
                        showToast('You have already taken this exam', 'error');
                        return;
                    }

                    // Store student info and quiz data
                    studentQuizData = {
                        quizId: quizDoc.id,
                        quizData: quiz,
                        studentInfo: {
                            uid: currentStudent.uid,
                            regNo: currentStudent.regNo,
                            name: currentStudent.name
                        }
                    };

                    // Initialize student answers array
                    studentAnswers = new Array(quiz.questions.length).fill(null);

                    // Show quiz interface
                    document.getElementById('student-form-container').style.display = 'none';
                    document.getElementById('quiz-taking-section').style.display = 'block';

                    // Start the quiz
                    startQuiz();
                });
        })
        .catch((error) => {
            showToast('Error checking exam: ' + error.message, 'error');
        });
});

// Start quiz function
function startQuiz() {
    if (!studentQuizData) return;

    const quiz = studentQuizData.quizData;

    // Set quiz subject
    document.getElementById('quiz-subject-name').textContent = quiz.subject;

    // Set total questions
    document.getElementById('total-questions').textContent = quiz.questions.length;

    // Initialize timer
    timeRemaining = quiz.timeLimit * 60; // Convert to seconds
    updateTimerDisplay();

    // Start timer
    quizTimer = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            submitQuiz();
        }
    }, 1000);

    // Display first question
    currentQuestionIndex = 0;
    displayQuestion(currentQuestionIndex);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('quiz-timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Change color when time is running out
    if (timeRemaining < 60) {
        document.getElementById('quiz-timer').style.color = 'var(--danger)';
    }
}

// Display question
function displayQuestion(index) {
    if (!studentQuizData || index >= studentQuizData.quizData.questions.length) return;

    const question = studentQuizData.quizData.questions[index];

    // Update question number
    document.getElementById('current-question').textContent = index + 1;

    // Set question text
    document.getElementById('question-text').textContent = question.question;

    // Create options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, i) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'quiz-option';
        radio.value = i;
        radio.id = `option-${i}`;

        // Check if this option was previously selected
        if (studentAnswers[index] === i) {
            radio.checked = true;
        }

        radio.addEventListener('change', () => {
            studentAnswers[index] = i;
        });

        const label = document.createElement('label');
        label.htmlFor = `option-${i}`;
        label.textContent = option;

        optionElement.appendChild(radio);
        optionElement.appendChild(label);
        optionsContainer.appendChild(optionElement);
    });

    // Update navigation buttons
    document.getElementById('prev-question-btn').disabled = index === 0;

    if (index === studentQuizData.quizData.questions.length - 1) {
        document.getElementById('next-question-btn').style.display = 'none';
        document.getElementById('submit-quiz-btn').style.display = 'block';
    } else {
        document.getElementById('next-question-btn').style.display = 'block';
        document.getElementById('submit-quiz-btn').style.display = 'none';
    }
}

// Next question button
document.getElementById('next-question-btn').addEventListener('click', function () {
    if (currentQuestionIndex < studentQuizData.quizData.questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion(currentQuestionIndex);
    }
});

// Previous question button
document.getElementById('prev-question-btn').addEventListener('click', function () {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion(currentQuestionIndex);
    }
});

// Submit quiz button
document.getElementById('submit-quiz-btn').addEventListener('click', function () {
    if (confirm('Are you sure you want to submit your quiz? You cannot retake it.')) {
        submitQuiz();
    }
});

// Submit quiz and calculate score
function submitQuiz() {
    clearInterval(quizTimer);

    if (!studentQuizData) return;

    const quiz = studentQuizData.quizData;
    let score = 0;

    // Prepare detailed question data for storage
    const detailedQuestions = [];

    // Calculate score and prepare question data
    quiz.questions.forEach((question, index) => {
        const isCorrect = studentAnswers[index] === question.correctAnswer;
        if (isCorrect) {
            score++;
        }

        detailedQuestions.push({
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            userAnswer: studentAnswers[index],
            explanation: question.explanation,
            isCorrect: isCorrect
        });
    });

    // Save score and detailed attempt to Firestore
    db.collection('scores').add({
        quizId: studentQuizData.quizId,
        quizSubject: quiz.subject,
        examCode: quiz.examCode,
        studentUid: studentQuizData.studentInfo.uid,
        studentName: studentQuizData.studentInfo.name,
        studentRegNo: studentQuizData.studentInfo.regNo,
        score: score,
        totalQuestions: quiz.questions.length,
        questions: detailedQuestions,
        attemptedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
        .then(() => {
            // Show results
            showQuizResults(score, quiz.questions.length);
        })
        .catch((error) => {
            showToast('Error saving your score: ' + error.message, 'error');
        });
}

// Show quiz results
function showQuizResults(score, totalQuestions) {
    document.getElementById('quiz-taking-section').style.display = 'none';
    document.getElementById('quiz-results-section').style.display = 'block';

    // Set results
    document.getElementById('result-subject').textContent = studentQuizData.quizData.subject;
    document.getElementById('student-score').textContent = score;
    document.getElementById('max-score').textContent = totalQuestions;

    // Set result message
    const percentage = (score / totalQuestions) * 100;
    let message = '';
    if (percentage >= 80) {
        message = 'Excellent job! You have a great understanding of this subject.';
    } else if (percentage >= 60) {
        message = 'Good effort! You understand the basics but could use some more practice.';
    } else {
        message = 'Keep studying! Review the material and try again with another quiz.';
    }
    document.getElementById('result-message').textContent = message;

    // Show question review
    const questionsReview = document.getElementById('questions-review');
    questionsReview.innerHTML = '';

    studentQuizData.quizData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'review-question';

        const isCorrect = studentAnswers[index] === question.correctAnswer;
        const answerStatus = isCorrect ? 'correct' : 'incorrect';

        questionElement.innerHTML = `
            <div class="question-status ${answerStatus}">
                <h4>Question ${index + 1}: ${question.question}</h4>
                <p class="status">Your answer was ${isCorrect ? 'correct' : 'incorrect'}</p>
            </div>
            <div class="question-explanation">
                <p><strong>Explanation:</strong> ${question.explanation}</p>
            </div>
        `;

        questionsReview.appendChild(questionElement);
    });
}

// Download explanation from results page
document.getElementById('download-explanation-btn').addEventListener('click', function () {
    if (!studentQuizData) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('PIK_QUIZ - Quiz Explanation', 105, 20, { align: 'center' });

    // Add quiz details
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`Subject: ${studentQuizData.quizData.subject}`, 20, 35);
    doc.text(`Exam Code: ${studentQuizData.quizData.examCode}`, 20, 45);
    doc.text(`Student: ${currentStudent.name}`, 20, 55);
    doc.text(`Registration No: ${currentStudent.regNo}`, 20, 65);
    doc.text(`Score: ${document.getElementById('student-score').textContent} / ${document.getElementById('max-score').textContent}`, 20, 75);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 85);

    // Add question review
    doc.text('Question Review:', 20, 100);

    let yPosition = 110;
    studentQuizData.quizData.questions.forEach((question, index) => {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        const isCorrect = studentAnswers[index] === question.correctAnswer;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Q${index + 1}: ${question.question}`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Your Answer: ${studentAnswers[index] !== null ? question.options[studentAnswers[index]] : 'Not answered'}`, 25, yPosition);
        yPosition += 7;

        doc.setTextColor(0, 128, 0);
        doc.text(`Correct Answer: ${question.options[question.correctAnswer]}`, 25, yPosition);
        yPosition += 7;

        doc.setTextColor(0, 0, 0);
        doc.text(`Explanation: ${question.explanation}`, 25, yPosition);
        yPosition += 15;
    });


    // Add generated date footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 105, 280, { align: 'center' });

    // Save the PDF
    doc.save(`${studentQuizData.quizData.subject}_Explanation.pdf`);
    showToast('Explanation downloaded successfully');
});

// Function to navigate to a specific page
function navigateToPage(page) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show the selected page
    document.getElementById(`${page}-page`).classList.add('active');

    // Clean up Firestore listeners when changing pages
    cleanupFirestore();
}

// Initialize the learning visualization animation
function initLearningVisual() {
    const items = document.querySelectorAll('.learning-visual-item');
    let index = 0;

    setInterval(() => {
        items.forEach(item => item.style.opacity = 0);
        items[index].style.opacity = 1;
        index = (index + 1) % items.length;
    }, 3000);
}

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // Check if user is a teacher
        db.collection('teachers').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    // User is a teacher
                    currentUser = user;
                    document.getElementById('header-teacher-login').style.display = 'none';
                    document.getElementById('header-student-login').style.display = 'none';
                    document.getElementById('logout-btn').style.display = 'block';

                    // If we're on the teacher page, show dashboard
                    if (document.getElementById('teacher-page').classList.contains('active')) {
                        showTeacherDashboard();
                    }
                } else {
                    // Check if user is a student
                    return db.collection('students').doc(user.uid).get();
                }
            })
            .then((doc) => {
                if (doc && doc.exists) {
                    // User is a student
                    currentStudent = {
                        uid: doc.id,
                        name: doc.data().name,
                        email: doc.data().email,
                        regNo: doc.data().regNo
                    };

                    // Store in sessionStorage
                    sessionStorage.setItem('currentStudent', JSON.stringify(currentStudent));

                    document.getElementById('header-teacher-login').style.display = 'none';
                    document.getElementById('header-student-login').style.display = 'none';
                    document.getElementById('logout-btn').style.display = 'block';

                    // If we're on the student page, show dashboard
                    if (document.getElementById('student-page').classList.contains('active')) {
                        showStudentDashboard();
                    }
                }
            })
            .catch((error) => {
                console.error("Error checking user type:", error);
            });
    } else {
        // User is signed out
        currentUser = null;
        currentStudent = null;
        document.getElementById('header-teacher-login').style.display = 'block';
        document.getElementById('header-student-login').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';

        // Clear session storage
        sessionStorage.removeItem('currentStudent');

        // Clean up Firestore listeners
        cleanupFirestore();
    }
});

// Check if student is already logged in from sessionStorage
function checkStudentLogin() {
    const savedStudent = sessionStorage.getItem('currentStudent');
    if (savedStudent) {
        currentStudent = JSON.parse(savedStudent);

        // If we're on the student page, show dashboard
        if (document.getElementById('student-page').classList.contains('active')) {
            showStudentDashboard();
        }
    }
}

// Initialize when page loads
window.addEventListener('load', function () {
    initLearningVisual();
    initBackgroundAnimation();
    checkStudentLogin();
});
