/**
 * constants.tsx
 *
 * IMPORTANT RULES:
 * - This file contains ONLY product templates (catalog)
 * - NO stock
 * - NO openingStock
 * - NO additions
 * - NO updatedAt
 * - NO Product type import
 *
 * These values are used ONLY when creating a product for the first time.
 * After that, ALL edits come from storage / cloud.
 */

export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  defaultPrice: number;
  imageUrl?: string;
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { id: 'c1', name: 'Tusker', category: 'Beer', defaultPrice: 250, imageUrl: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9' },
  { id: 'c2', name: 'GUINESS', category: 'Beer', defaultPrice: 250, imageUrl: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98' },
  { id: 'c3', name: 'WHITECUP', category: 'Beer', defaultPrice: 250, imageUrl: 'https://images.unsplash.com/photo-1550341914-8d17ca390a78' },
  { id: 'c4', name: 'Tusker Can', category: 'Beer', defaultPrice: 250 },
  { id: 'c5', name: 'T. Cinder', category: 'Beer', defaultPrice: 300 },
  { id: 'c6', name: 'T. Cinder Can', category: 'Beer', defaultPrice: 300 },
  { id: 'c7', name: 'W. Cap', category: 'Beer', defaultPrice: 300 },
  { id: 'c8', name: 'Balozi', category: 'Beer', defaultPrice: 250 },
  { id: 'c9', name: 'Balozi Can', category: 'Beer', defaultPrice: 300 },
  { id: 'c10', name: 'Guarana', category: 'Beer', defaultPrice: 250 },
  { id: 'c11', name: 'Red Bull', category: 'Beer', defaultPrice: 250 },

  { id: 'c12', name: 'Smirnoff 750ml', category: 'Spirit', defaultPrice: 1800 },
  { id: 'c13', name: 'Smirnoff 250ml', category: 'Spirit', defaultPrice: 600 },
  { id: 'c14', name: 'ALVARO', category: 'Spirit', defaultPrice: 200 },

  { id: 'c15', name: 'Richot 750ml', category: 'Brandy', defaultPrice: 1800 },
  { id: 'c16', name: 'Richot 250ml', category: 'Brandy', defaultPrice: 600 },
  { id: 'c17', name: 'Viceroy 350ml', category: 'Brandy', defaultPrice: 900 },

  { id: 'c18', name: 'Q.B', category: 'Spirit', defaultPrice: 250 },
  { id: 'c19', name: 'V&A 750ml', category: 'Spirit', defaultPrice: 1000 },

  { id: 'c20', name: 'Black & White 750ml', category: 'Whisky', defaultPrice: 1200 },
  { id: 'c21', name: 'VAT 69 750ml', category: 'Whisky', defaultPrice: 1800 },
  { id: 'c22', name: 'Captain Morgan 750ml', category: 'Whisky', defaultPrice: 1300 },
  { id: 'c34', name: 'Best Whisky', category: 'Whisky', defaultPrice: 1500 },

  { id: 'c23', name: 'County 3/4', category: 'Spirit', defaultPrice: 900 },
  { id: 'c24', name: 'KEG', category: 'Beer', defaultPrice: 7200 },

  { id: 'c25', name: 'Sports Man', category: 'Others', defaultPrice: 25 },
  { id: 'c26', name: 'Safari', category: 'Others', defaultPrice: 20 },
  { id: 'c27', name: 'Matchbox', category: 'Others', defaultPrice: 10 },

  { id: 'c28', name: 'KIBAO', category: 'Vodca', defaultPrice: 1000 },
  { id: 'c29', name: 'KONYAGI 1/2', category: 'Vodca', defaultPrice: 600 },
  { id: 'c30', name: 'KONYAGI 3/4', category: 'Vodca', defaultPrice: 1200 },

  { id: 'c31', name: 'H. CHOICE', category: 'Spirit', defaultPrice: 1300 },
  { id: 'c32', name: 'B. CAN', category: 'Beer', defaultPrice: 300 },
  { id: 'c33', name: 'G. CAN', category: 'Beer', defaultPrice: 300 },

  { id: 'c35', name: 'Bestcream', category: 'Spirit', defaultPrice: 1500 },

  { id: 'c36', name: 'PET 500ml', category: 'Soda', defaultPrice: 100 },
  { id: 'c37', name: 'PET 1.5L', category: 'Soda', defaultPrice: 150 },
  { id: 'c38', name: 'PET 300ml', category: 'Soda', defaultPrice: 60 },

  { id: 'c39', name: 'Water 1L', category: 'Water', defaultPrice: 100 },
  { id: 'c40', name: 'Water 1/2L', category: 'Water', defaultPrice: 60 },

  { id: 'c41', name: 'Delmonte', category: 'Soda', defaultPrice: 100 },
  { id: 'c42', name: 'Afia', category: 'Soda', defaultPrice: 300 },

  { id: 'c43', name: 'Caribia 1/4', category: 'Spirit', defaultPrice: 300 },
  { id: 'c44', name: 'Caribia 3/4', category: 'Spirit', defaultPrice: 1000 },

  { id: 'c45', name: 'Trust', category: 'Others', defaultPrice: 50 },
  { id: 'c46', name: 'Casabuena', category: 'Spirit', defaultPrice: 1000 },
  { id: 'c47', name: 'Caprice', category: 'Spirit', defaultPrice: 1000 },

  { id: 'c48', name: 'Penasol', category: 'Others', defaultPrice: 1000 },
  { id: 'c49', name: 'Sangilia 1.5L', category: 'Spirit', defaultPrice: 2000 },

  { id: 'c50', name: 'FAXE', category: 'Beer', defaultPrice: 350 },

  { id: 'c51', name: 'Lemonade', category: 'Soda', defaultPrice: 50 },
  { id: 'c52', name: 'Preditor', category: 'Soda', defaultPrice: 80 },
  { id: 'c53', name: 'Soda Take Away', category: 'Soda', defaultPrice: 50 },
  { id: 'c54', name: 'Soda Kubwa', category: 'Soda', defaultPrice: 100 },
  { id: 'c55', name: 'Soda Ndogo', category: 'Soda', defaultPrice: 60 },
];

export const CATEGORIES = [
  'All',
  'Beer',
  'Spirit',
  'Whisky',
  'Vodca',
  'Brandy',
  'Gin',
  'Soda',
  'Water',
  'Others',
];
