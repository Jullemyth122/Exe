import { Injectable, signal, effect } from '@angular/core';

export interface Item {
  name: string;
  breed: string;
  age: number;
  id: number;
  img: string;
}

@Injectable({
  providedIn: 'root',
})
export class CrudService {
  private STORAGE_KEY = 'angular_crud_items';

  // Store state
  private itemsSignal = signal<Item[]>([]);

  items = this.itemsSignal.asReadonly();

  constructor() {
    // Load initial data from localStorage
    const saved = localStorage.getItem(this.STORAGE_KEY);
    let loadedItems: Item[] = [];
    if (saved) {
      try {
        loadedItems = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse CRUD items from localStorage', e);
      }
    }

    // Automatically load demo data if empty, or if we have incomplete test items (like JohnnySins or items without images)
    const hasIncompletePlaceholder =
      !loadedItems ||
      loadedItems.length === 0 ||
      loadedItems.some((item) => item.name === 'JohnnySins' || !item.img);

    if (hasIncompletePlaceholder) {
      loadedItems = [
        {
          id: 1,
          name: 'Max',
          breed: 'Golden Retriever',
          age: 2,
          img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600',
        },
        {
          id: 2,
          name: 'Bella',
          breed: 'French Bulldog',
          age: 3,
          img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600',
        },
        {
          id: 3,
          name: 'Rocky',
          breed: 'Siberian Husky',
          age: 4,
          img: 'https://images.unsplash.com/photo-1531804055935-76f44d7c3621?auto=format&fit=crop&q=80&w=600',
        },
        {
          id: 4,
          name: 'Luna',
          breed: 'Pomeranian',
          age: 1,
          img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=600',
        },
        {
          id: 5,
          name: 'Charlie',
          breed: 'Beagle',
          age: 5,
          img: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&q=80&w=600',
        },
        {
          id: 6,
          name: 'Coco',
          breed: 'Poodle',
          age: 2,
          img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600',
        },
      ];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(loadedItems));
    }

    this.itemsSignal.set(loadedItems);

    // Auto-save changes to localStorage whenever the signal updates
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    });
  }

  // resetToDemo() {
  //   const demoItems = [
  //     {
  //       id: 1,
  //       name: 'Max',
  //       breed: 'Golden Retriever',
  //       age: 2,
  //       img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600',
  //     },
  //     {
  //       id: 2,
  //       name: 'Bella',
  //       breed: 'French Bulldog',
  //       age: 3,
  //       img: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600',
  //     },
  //     {
  //       id: 3,
  //       name: 'Rocky',
  //       breed: 'Siberian Husky',
  //       age: 4,
  //       img: 'https://images.unsplash.com/photo-1531804055935-76f44d7c3621?auto=format&fit=crop&q=80&w=600',
  //     },
  //     {
  //       id: 4,
  //       name: 'Luna',
  //       breed: 'Pomeranian',
  //       age: 1,
  //       img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=600',
  //     },
  //     {
  //       id: 5,
  //       name: 'Charlie',
  //       breed: 'Beagle',
  //       age: 5,
  //       img: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?auto=format&fit=crop&q=80&w=600',
  //     },
  //     {
  //       id: 6,
  //       name: 'Coco',
  //       breed: 'Poodle',
  //       age: 2,
  //       img: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600',
  //     },
  //   ];
  //   this.itemsSignal.set(demoItems);
  // }

  createItem(newItem: Item) {
    this.itemsSignal.update((current) => [...current, newItem]);
  }

  readItem(id: number) {
    return this.itemsSignal().find((item) => item.id === id);
  }

  updateItem(id: number, updatedItem: Item) {
    this.itemsSignal.update((current) =>
      current.map((item) => (item.id === id ? updatedItem : item)),
    );
  }

  deleteItem(id: number) {
    this.itemsSignal.update((current) => current.filter((item) => item.id !== id));
  }
}
