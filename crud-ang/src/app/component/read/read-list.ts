import { Component, inject, input, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CrudService, Item } from '../../crud.service';

@Component({
  selector: 'read-list',
  standalone: true,
  imports: [],
  templateUrl: './read-list.html',
  styleUrl: './read-list.scss',
})
export class ReadListComponent {
  private crudService = inject(CrudService);
  private router = inject(Router);

  // Accept input items from parent if provided, otherwise default to service items
  itemsInput = input<Item[] | null>(null, { alias: 'items' });

  items = computed(() => this.itemsInput() ?? this.crudService.items());

  // Search & Filter State
  searchQuery = signal<string>('');
  selectedBreed = signal<string>('All');

  // Delete confirmation modal state
  pendingDeleteId = signal<number | null>(null);
  pendingDeleteName = signal<string>('');

  // Computed list of unique breeds for filtering pills
  breeds = computed(() => {
    const list = this.items().map((item) => item.breed);
    return ['All', ...Array.from(new Set(list))];
  });

  // Filtered items list based on search and breed pill
  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const breed = this.selectedBreed();

    return this.items().filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(query) || item.breed.toLowerCase().includes(query);
      const matchesBreed = breed === 'All' || item.breed === breed;

      return matchesSearch && matchesBreed;
    });
  });

  // Simple helpers for age category
  getAgeCategory(age: number): 'Puppy' | 'Young' | 'Adult' {
    if (age <= 1) return 'Puppy';
    if (age <= 3) return 'Young';
    return 'Adult';
  }

  updateSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  selectBreed(breed: string) {
    this.selectedBreed.set(breed);
  }

  navigateToEdit(id: number) {
    this.router.navigate(['/edit', id]);
  }

  openDeleteModal(id: number, name: string) {
    this.pendingDeleteId.set(id);
    this.pendingDeleteName.set(name);
  }

  cancelDelete() {
    this.pendingDeleteId.set(null);
    this.pendingDeleteName.set('');
  }

  confirmDelete() {
    const id = this.pendingDeleteId();
    if (id !== null) {
      this.crudService.deleteItem(id);
    }
    this.cancelDelete();
  }
}
