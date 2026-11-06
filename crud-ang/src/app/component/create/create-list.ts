import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CrudService, Item } from '../../crud.service';

@Component({
  selector: 'create-item',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-list.html',
  styleUrl: './create-list.scss',
})
export class CreateFormComponent implements OnInit {
  private crudService = inject(CrudService);
  private router = inject(Router);

  createItem = input<string>('Create A Item');
  formSubmit = output<Omit<Item, 'id' | 'img'> & { random_uid: string }>();

  // Keep track of the currently generated UID
  generatedUid = signal<string>('');

  ngOnInit() {
    this.regenerateUid();
  }

  regenerateUid() {
    const randomPart = Math.random().toString(36).substring(2, 10);
    this.generatedUid.set(`uid-${randomPart}`);
  }

  onSubmit(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;

    const name = (form.querySelector('#name') as HTMLInputElement).value;
    const breed = (form.querySelector('#breed') as HTMLInputElement).value;
    const age = Number((form.querySelector('#age') as HTMLInputElement).value);
    const random_uid = this.generatedUid();

    // Emit event for compatibility
    this.formSubmit.emit({
      name,
      breed,
      age,
      random_uid,
    });

    // Generate unique ID and a default cute dog image for the catalog
    const currentItems = this.crudService.items();
    const nextId =
      currentItems.length > 0 ? Math.max(...currentItems.map((item) => item.id)) + 1 : 1;
    const defaultImg =
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600';

    this.crudService.createItem({
      id: nextId,
      name,
      breed,
      age,
      img: defaultImg,
    });

    form.reset();
    this.regenerateUid();

    // Redirect user back to catalog list
    this.router.navigate(['/items']);
  }
}
