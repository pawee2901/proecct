import { Routes } from '@angular/router';
import { LoginRegisterComponent } from './login-register/login-register.component';
import { TeacherComponent } from './teacher/teacher.component';
import { AdminComponent } from './admin/admin.component';
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
  { path: 'teacher', component: TeacherComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: 'login' }
];
