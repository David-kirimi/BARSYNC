
import { Product } from './types';

export const COMMON_PRODUCTS: Product[] = [
  { id: '1', name: 'Tusker Lager', category: 'Beer', price: 250, stock: 50, openingStock: 50, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?auto=format&fit=crop&q=80&w=200' },
  { id: '2', name: 'Guinness Stout', category: 'Beer', price: 250, stock: 40, openingStock: 40, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=200' },
  { id: '3', name: 'White Cap Crisp', category: 'Beer', price: 250, stock: 30, openingStock: 30, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1550341914-8d17ca390a78?auto=format&fit=crop&q=80&w=200' },
  { id: '12', name: 'Smirnoff Vodka 750ml', category: 'Spirit', price: 1800, stock: 10, openingStock: 10, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1550985543-565656719853?auto=format&fit=crop&q=80&w=200' },
  { id: '19', name: 'Black & White Whisky', category: 'Whisky', price: 1200, stock: 5, openingStock: 5, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1527281400828-ac737aef5ad4?auto=format&fit=crop&q=80&w=200' },
  { id: '25', name: 'Afia Juice', category: 'Soda', price: 300, stock: 24, openingStock: 24, additions: 0, imageUrl: 'https://images.unsplash.com/photo-1621506289937-4c40aa2cc94c?auto=format&fit=crop&q=80&w=200' },
];

export const CATEGORIES = [
  'All', 'Beer', 'Spirit', 'Whisky', 'Vodca', 'Brandy', 'Soft Drink', 'Others'
];
