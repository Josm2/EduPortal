// Global variables
let currentUser = null;
let selectedRole = null;

// Firebase imports (will be available after Firebase script loads)
let auth, db;
let createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged;
let collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy;

// Wait for Firebase to load
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
            auth = window.firebaseAuth;
            db = window.firebaseDb;
            
            // Import Firebase functions
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(authModule => {
                createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
                signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
                signOut = authModule.signOut;
                onAuthStateChanged = authModule.onAuthStateChanged;
                
                return import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            }).then(firestoreModule => {
                collection = firestoreModule.collection;
                addDoc = firestoreModule.addDoc;
                getDocs = firestoreModule.getDocs;
                doc = firestoreModule.doc;
                updateDoc = firestoreModule.updateDoc;
                deleteDoc = firestoreModule.deleteDoc;
                query = firestoreModule.query;
                where = firestoreModule.where;
                orderBy = firestoreModule.orderBy;
                
                // Initialize the app
                initializeApp();
            });
            
            clearInterval(checkFirebase);
        }
    }, 100);
});

function initializeApp() {
    // Set up authentication state observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserDashboard();
        } else {
            currentUser = null;
            showLoginSection();
        }
    });

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Role selection
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedRole = this.dataset.role;
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('loginForm').classList.add('active');
            document.getElementById('loginBtn').disabled = false;
        });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout buttons
    document.getElementById('studentLogout').addEventListener('click', handleLogout);
    document.getElementById('teacherLogout').addEventListener('click', handleLogout);

    // Teacher dashboard buttons
    document.getElementById('addGradeBtn').addEventListener('click', () => openGradeModal());
    document.getElementById('markAttendanceBtn').addEventListener('click', () => openAttendanceModal());

    // Modal event listeners
    setupModalListeners();
}

function setupModalListeners() {
    // Grade modal
    document.getElementById('closeGradeModal').addEventListener('click', closeGradeModal);
    document.getElementById('cancelGrade').addEventListener('click', closeGradeModal);
    document.getElementById('gradeForm').addEventListener('submit', handleGradeSubmit);

    // Attendance modal
    document.getElementById('closeAttendanceModal').addEventListener('click', closeAttendanceModal);
    document.getElementById('cancelAttendance').addEventListener('click', closeAttendanceModal);
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);

    // Close modals when clicking outside
    document.getElementById('gradeModal').addEventListener('click', function(e) {
        if (e.target === this) closeGradeModal();
    });
    document.getElementById('attendanceModal').addEventListener('click', function(e) {
        if (e.target === this) closeAttendanceModal();
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorMsg = document.getElementById('errorMessage');
    
    // Show loading state
    loginBtn.querySelector('.btn-text').style.display = 'none';
    loginBtn.querySelector('.loading-spinner').style.display = 'inline-block';
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';
    
    try {
        // Try to sign in first
        await signInWithEmailAndPassword(auth, email, password);
        
        // Store user role in Firestore
        await updateUserRole(email, selectedRole);
        
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            try {
                // Create new user if not found
                await createUserWithEmailAndPassword(auth, email, password);
                await updateUserRole(email, selectedRole);
            } catch (createError) {
                showError(createError.message);
            }
        } else {
            showError(error.message);
        }
    } finally {
        // Reset button state
        loginBtn.querySelector('.btn-text').style.display = 'inline-block';
        loginBtn.querySelector('.loading-spinner').style.display = 'none';
        loginBtn.disabled = false;
    }
}

async function updateUserRole(email, role) {
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
            email: email,
            role: role,
            name: email.split('@')[0], // Use email prefix as name
            createdAt: new Date()
        }).catch(async (error) => {
            if (error.code === 'not-found') {
                // Document doesn't exist, create it
                await addDoc(collection(db, 'users'), {
                    uid: currentUser.uid,
                    email: email,
                    role: role,
                    name: email.split('@')[0],
                    createdAt: new Date()
                });
            }
        });
    } catch (error) {
        console.error('Error updating user role:', error);
    }
}

async function loadUserDashboard() {
    try {
        // Get user data from Firestore
        const usersQuery = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
        const userSnapshot = await getDocs(usersQuery);
        
        let userRole = selectedRole || 'student'; // fallback
        let userName = currentUser.email.split('@')[0];
        
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            userRole = userData.role;
            userName = userData.name || userName;
        }
        
        if (userRole === 'student') {
            showStudentDashboard(userName);
            await loadStudentData();
        } else {
            showTeacherDashboard(userName);
            await loadTeacherData();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard');
    }
}

function showLoginSection() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('loginSection').classList.add('active');
}

function showStudentDashboard(userName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('studentDashboard').classList.add('active');
    document.getElementById('studentName').textContent = userName;
}

function showTeacherDashboard(userName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('teacherDashboard').classList.add('active');
    document.getElementById('teacherName').textContent = userName;
}

async function loadStudentData() {
    await Promise.all([
        loadStudentGrades(),
        loadStudentAttendance(),
        loadStudentFeedback()
    ]);
}

async function loadStudentGrades() {
    const gradesContainer = document.getElementById('studentGrades');
    
    try {
        const gradesQuery = query(
            collection(db, 'grades'),
            where('studentEmail', '==', currentUser.email),
            orderBy('date', 'desc')
        );
        const gradesSnapshot = await getDocs(gradesQuery);
        
        if (gradesSnapshot.empty) {
            gradesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>No Grades Yet</h4>
                    <p>Your grades will appear here once your teachers add them.</p>
                </div>
            `;
            return;
        }
        
        const gradesHtml = gradesSnapshot.docs.map(doc => {
            const grade = doc.data();
            const gradeClass = getGradeClass(grade.grade);
            return `
                <div class="grade-item">
                    <div class="grade-info">
                        <h4>${grade.subject}</h4>
                        <p>${new Date(grade.date.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div class="grade-score ${gradeClass}">${grade.grade}%</div>
                </div>
            `;
        }).join('');
        
        gradesContainer.innerHTML = gradesHtml;
    } catch (error) {
        console.error('Error loading grades:', error);
        gradesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Grades</h4>
                <p>Unable to load your grades. Please try again later.</p>
            </div>
        `;
    }
}

async function loadStudentAttendance() {
    const attendanceContainer = document.getElementById('studentAttendance');
    
    try {
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('studentEmail', '==', currentUser.email),
            orderBy('date', 'desc')
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        if (attendanceSnapshot.empty) {
            attendanceContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h4>No Attendance Records</h4>
                    <p>Your attendance records will appear here.</p>
                </div>
            `;
            return;
        }
        
        const attendanceHtml = attendanceSnapshot.docs.map(doc => {
            const attendance = doc.data();
            return `
                <div class="attendance-item">
                    <div class="attendance-info">
                        <h4>${attendance.subject}</h4>
                        <p>${new Date(attendance.date.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div class="attendance-status ${attendance.status}">${attendance.status}</div>
                </div>
            `;
        }).join('');
        
        attendanceContainer.innerHTML = attendanceHtml;
    } catch (error) {
        console.error('Error loading attendance:', error);
        attendanceContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Attendance</h4>
                <p>Unable to load your attendance records. Please try again later.</p>
            </div>
        `;
    }
}

async function loadStudentFeedback() {
    const feedbackContainer = document.getElementById('studentFeedback');
    
    try {
        const feedbackQuery = query(
            collection(db, 'feedback'),
            where('studentEmail', '==', currentUser.email),
            orderBy('date', 'desc')
        );
        const feedbackSnapshot = await getDocs(feedbackQuery);
        
        if (feedbackSnapshot.empty) {
            feedbackContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h4>No Feedback Yet</h4>
                    <p>Teacher feedback will appear here.</p>
                </div>
            `;
            return;
        }
        
        const feedbackHtml = feedbackSnapshot.docs.map(doc => {
            const feedback = doc.data();
            return `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <span class="feedback-subject">${feedback.subject}</span>
                        <span class="feedback-date">${new Date(feedback.date.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    <div class="feedback-content">${feedback.content}</div>
                    <div class="feedback-teacher">- ${feedback.teacherName}</div>
                </div>
            `;
        }).join('');
        
        feedbackContainer.innerHTML = feedbackHtml;
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbackContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Feedback</h4>
                <p>Unable to load feedback. Please try again later.</p>
            </div>
        `;
    }
}

async function loadTeacherData() {
    await Promise.all([
        loadAllStudentGrades(),
        loadAllAttendance(),
        loadStudentList()
    ]);
}

async function loadAllStudentGrades() {
    const gradesContainer = document.getElementById('studentGradesList');
    
    try {
        const gradesQuery = query(collection(db, 'grades'), orderBy('date', 'desc'));
        const gradesSnapshot = await getDocs(gradesQuery);
        
        if (gradesSnapshot.empty) {
            gradesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>No Grades Added Yet</h4>
                    <p>Click "Add Grade" to start adding student grades.</p>
                </div>
            `;
            return;
        }
        
        const gradesHtml = gradesSnapshot.docs.map(doc => {
            const grade = doc.data();
            const gradeClass = getGradeClass(grade.grade);
            return `
                <div class="grade-item">
                    <div class="grade-info">
                        <h4>${grade.studentEmail} - ${grade.subject}</h4>
                        <p>${new Date(grade.date.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div class="grade-score ${gradeClass}">${grade.grade}%</div>
                    <div class="grade-actions">
                        <button class="edit-btn" onclick="editGrade('${doc.id}', ${JSON.stringify(grade).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" onclick="deleteGrade('${doc.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        gradesContainer.innerHTML = gradesHtml;
    } catch (error) {
        console.error('Error loading grades:', error);
        gradesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Grades</h4>
                <p>Unable to load student grades. Please try again later.</p>
            </div>
        `;
    }
}

async function loadAllAttendance() {
    const attendanceContainer = document.getElementById('attendanceList');
    
    try {
        const attendanceQuery = query(collection(db, 'attendance'), orderBy('date', 'desc'));
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        if (attendanceSnapshot.empty) {
            attendanceContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h4>No Attendance Records</h4>
                    <p>Click "Mark Attendance" to start tracking attendance.</p>
                </div>
            `;
            return;
        }
        
        const attendanceHtml = attendanceSnapshot.docs.map(doc => {
            const attendance = doc.data();
            return `
                <div class="attendance-item">
                    <div class="attendance-info">
                        <h4>${attendance.studentEmail} - ${attendance.subject}</h4>
                        <p>${new Date(attendance.date.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div class="attendance-status ${attendance.status}">${attendance.status}</div>
                </div>
            `;
        }).join('');
        
        attendanceContainer.innerHTML = attendanceHtml;
    } catch (error) {
        console.error('Error loading attendance:', error);
        attendanceContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Attendance</h4>
                <p>Unable to load attendance records. Please try again later.</p>
            </div>
        `;
    }
}

async function loadStudentList() {
    try {
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const studentSelect = document.getElementById('studentSelect');
        studentSelect.innerHTML = '<option value="">Select a student</option>';
        
        studentsSnapshot.docs.forEach(doc => {
            const student = doc.data();
            const option = document.createElement('option');
            option.value = student.email;
            option.textContent = `${student.name} (${student.email})`;
            studentSelect.appendChild(option);
        });
        
        // Also populate attendance modal
        const attendanceList = document.getElementById('studentAttendanceList');
        if (studentsSnapshot.empty) {
            attendanceList.innerHTML = '<p>No students found. Students need to register first.</p>';
        } else {
            const studentsHtml = studentsSnapshot.docs.map(doc => {
                const student = doc.data();
                return `
                    <div class="student-attendance-item">
                        <span class="student-name">${student.name} (${student.email})</span>
                        <div class="attendance-toggle">
                            <label>
                                <input type="radio" name="attendance_${student.email}" value="present" required>
                                Present
                            </label>
                            <label>
                                <input type="radio" name="attendance_${student.email}" value="absent" required>
                                Absent
                            </label>
                        </div>
                    </div>
                `;
            }).join('');
            attendanceList.innerHTML = studentsHtml;
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function getGradeClass(grade) {
    if (grade >= 90) return 'excellent';
    if (grade >= 80) return 'good';
    if (grade >= 70) return 'average';
    return 'poor';
}

function openGradeModal(gradeId = null, gradeData = null) {
    const modal = document.getElementById('gradeModal');
    const form = document.getElementById('gradeForm');
    const title = document.getElementById('gradeModalTitle');
    
    if (gradeId && gradeData) {
        title.textContent = 'Edit Grade';
        document.getElementById('studentSelect').value = gradeData.studentEmail;
        document.getElementById('subject').value = gradeData.subject;
        document.getElementById('grade').value = gradeData.grade;
        document.getElementById('gradeDate').value = new Date(gradeData.date.seconds * 1000).toISOString().split('T')[0];
        form.dataset.gradeId = gradeId;
    } else {
        title.textContent = 'Add Grade';
        form.reset();
        form.dataset.gradeId = '';
        document.getElementById('gradeDate').value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.add('active');
}

function closeGradeModal() {
    document.getElementById('gradeModal').classList.remove('active');
}

async function handleGradeSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const gradeId = form.dataset.gradeId;
    const gradeData = {
        studentEmail: document.getElementById('studentSelect').value,
        subject: document.getElementById('subject').value,
        grade: parseInt(document.getElementById('grade').value),
        date: new Date(document.getElementById('gradeDate').value),
        teacherEmail: currentUser.email
    };
    
    try {
        if (gradeId) {
            await updateDoc(doc(db, 'grades', gradeId), gradeData);
        } else {
            await addDoc(collection(db, 'grades'), gradeData);
        }
        
        closeGradeModal();
        await loadAllStudentGrades();
    } catch (error) {
        console.error('Error saving grade:', error);
        showError('Failed to save grade');
    }
}

function editGrade(gradeId, gradeData) {
    openGradeModal(gradeId, gradeData);
}

async function deleteGrade(gradeId) {
    if (confirm('Are you sure you want to delete this grade?')) {
        try {
            await deleteDoc(doc(db, 'grades', gradeId));
            await loadAllStudentGrades();
        } catch (error) {
            console.error('Error deleting grade:', error);
            showError('Failed to delete grade');
        }
    }
}

function openAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    
    const date = new Date(document.getElementById('attendanceDate').value);
    const subject = document.getElementById('attendanceSubject').value;
    const attendanceInputs = document.querySelectorAll('input[name^="attendance_"]:checked');
    
    const attendanceRecords = [];
    attendanceInputs.forEach(input => {
        const studentEmail = input.name.replace('attendance_', '');
        attendanceRecords.push({
            studentEmail: studentEmail,
            subject: subject,
            date: date,
            status: input.value,
            teacherEmail: currentUser.email
        });
    });
    
    try {
        // Add all attendance records
        const promises = attendanceRecords.map(record => 
            addDoc(collection(db, 'attendance'), record)
        );
        await Promise.all(promises);
        
        closeAttendanceModal();
        await loadAllAttendance();
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        selectedRole = null;
        document.getElementById('loginForm').classList.remove('active');
        document.getElementById('loginForm').reset();
        document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('loginBtn').disabled = true;
    } catch (error) {
        console.error('Error signing out:', error);
        showError('Failed to sign out');
    }
}

function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 5000);
}
