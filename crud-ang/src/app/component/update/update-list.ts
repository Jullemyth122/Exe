import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CrudService, Item } from '../../crud.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'update-item',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './update-list.html',
  styleUrl: './update-list.scss',
})
export class UpdateFormComponent implements OnInit {
  private crudService = inject(CrudService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  itemId = signal<number | null>(null);
  notFound = signal<boolean>(false);

  // Form model
  name = signal<string>('');
  breed = signal<string>('');
  age = signal<number>(0);
  img = signal<string>('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const item = this.crudService.readItem(id);

    if (!item) {
      this.notFound.set(true);
      return;
    }

    this.itemId.set(id);
    this.name.set(item.name);
    this.breed.set(item.breed);
    this.age.set(item.age);
    this.img.set(item.img);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    const id = this.itemId();
    if (id === null) return;

    const updated: Item = {
      id,
      name: this.name(),
      breed: this.breed(),
      age: this.age(),
      img: this.img(),
    };

    this.crudService.updateItem(id, updated);
    this.router.navigate(['/items']);
  }
}
