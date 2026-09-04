import { Routes } from '@angular/router';
import { LoginRegisterComponent } from './login-register/login-register.component';
import { TeacherShellComponent } from './teacher/shell/teacher-shell.component';
import { TeacherStudentsComponent } from './teacher/pages/students/teacher-students.component';
import { TeacherLessonsComponent } from './teacher/pages/lessons/teacher-lessons.component';
import { TeacherGameCoversComponent } from './teacher/pages/game-covers/teacher-game-covers.component';
import { TeacherPracticeContentComponent } from './teacher/pages/practice-content/teacher-practice-content.component';
import { TeacherProfileComponent } from './teacher/pages/profile/teacher-profile.component';
import { AdminShellComponent } from './admin/shell/admin-shell.component';
import { AdminOverviewComponent } from './admin/pages/overview/admin-overview.component';
import { AdminUsersComponent } from './admin/pages/users/admin-users.component';
import { AdminApisComponent } from './admin/pages/apis/admin-apis.component';
import { AdminCoursesComponent } from './admin/pages/courses/admin-courses.component';
import { AdminSystemComponent } from './admin/pages/system/admin-system.component';
import { AdminProfileComponent } from './admin/pages/profile/admin-profile.component';
import { StudentShellComponent } from './student/shell/student-shell.component';
import { StudentLessonsComponent } from './student/pages/lessons/student-lessons.component';
import { StudentVocabularyComponent } from './student/pages/vocabulary/student-vocabulary.component';
import { StudentGamesComponent } from './student/pages/games/student-games.component';
import { StudentPracticeComponent } from './student/pages/practice/student-practice.component';
import { StudentProfileComponent } from './student/pages/profile/student-profile.component';
import { StudentVideosComponent } from './student/pages/videos/student-videos.component';
import { StudentReviewComponent } from './student/pages/review/student-review.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginRegisterComponent },
  {
    path: 'student',
    component: StudentShellComponent,
    children: [
      { path: '', redirectTo: 'lessons', pathMatch: 'full' },
      { path: 'lessons', component: StudentLessonsComponent },
      { path: 'vocabulary', component: StudentVocabularyComponent },
      { path: 'games', component: StudentGamesComponent },
      { path: 'practice', component: StudentPracticeComponent },
      { path: 'profile', component: StudentProfileComponent },
      { path: 'videos', component: StudentVideosComponent },
      { path: 'review', component: StudentReviewComponent },
    ],
  },
  {
    path: 'teacher',
    component: TeacherShellComponent,
    children: [
      { path: '', redirectTo: 'students', pathMatch: 'full' },
      { path: 'students', component: TeacherStudentsComponent },
      { path: 'lessons', component: TeacherLessonsComponent },
      { path: 'game-covers', component: TeacherGameCoversComponent },
      { path: 'practice-content', component: TeacherPracticeContentComponent },
      { path: 'profile', component: TeacherProfileComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'apis', component: AdminApisComponent },
      { path: 'courses', component: AdminCoursesComponent },
      { path: 'system', component: AdminSystemComponent },
      { path: 'profile', component: AdminProfileComponent },
    ],
  },
  { path: '**', redirectTo: 'login' }
];
