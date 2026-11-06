import { Routes } from '@angular/router';
import { ReadListComponent } from './component/read/read-list';
import { CreateFormComponent } from './component/create/create-list';
import { UpdateFormComponent } from './component/update/update-list';

export const routes: Routes = [
  { path: '', redirectTo: 'items', pathMatch: 'full' },
  { path: 'items', component: ReadListComponent },
  { path: 'create', component: CreateFormComponent },
  { path: 'edit/:id', component: UpdateFormComponent },
  { path: '**', redirectTo: 'items' }, // Fallback path MUST be last
];
