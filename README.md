# pik-quiz
A website platform to conduct quiz and make the learning process engaging.
PIK_QUIZ is a comprehensive web-based portal designed to bridge the gap between assessment and learning. It empowers teachers to create dynamic, time-bound examinations and allows students to test their knowledge while receiving immediate, detailed feedback on their performance.



🚀 Live Demo
Hosted Site: https://pik-quiz-platform.web.app/

🛠️ Key Technical Features
👨‍🏫 Teacher Portal

Secure Authentication: Email and password-based login and registration via Firebase Auth.


Dynamic Quiz Creation: Build custom quizzes with unique exam codes, specific time limits, and automated expiration timestamps.



Performance Monitoring: Real-time tracking of student scores and attempts with the ability to export results as professional PDF reports.


Data Management: Full CRUD (Create, Read, Update, Delete) capabilities for quizzes and account management.


🎓 Student Experience

Exam Entry: Access examinations via unique secure exam codes.




Timed Assessments: Integrated countdown timers to simulate real-world testing environments.


Learning-Centric Feedback: Immediate results page featuring detailed explanations for every question to ensure students learn from their mistakes.



Attempt History: A personal dashboard to review previous performance and download detailed explanation reports.


💻 Tech Stack

Frontend: HTML5, CSS3 (with responsive Flexbox/Grid layouts), and Vanilla JavaScript.



Backend/BaaS: Firebase (Firestore for NoSQL data, Firebase Auth for security, and Firebase Hosting).





Libraries: * jsPDF & AutoTable: For generating on-the-fly PDF reports and certificates.

FontAwesome: For an intuitive and modern UI icon set.


Security: Implemented granular Firestore Security Rules to ensure data privacy between teachers and students.


📁 Project Structure
Plaintext

├── index.html          # Main application structure and UI portals

├── script.js           # Core logic, Firebase integration, and state management

├── style.css           # Custom styling and glassmorphism UI effects

├── firebase.json       # Firebase deployment and rewrite configurations

├── firestore.rules     # Database security and access control logic

└── firestore.indexes.json # Optimized query indexes for performance
🔧 Installation & Setup
Clone the repository:

Bash

git clone https://github.com/irshad-03/pik-quiz.git
Initialize Firebase: Ensure you have the Firebase CLI installed, then run:

Bash

firebase init
Deploy to the Web:

Bash

firebase deploy
