-- ==========================================================
-- GROCERAI REALISTIC SEED DATA
-- Fulfilling Section 32 Requirements
-- ==========================================================

-- Insert Categories
INSERT INTO categories (id, name, icon, slug, description) VALUES
('c1000000-0000-0000-0000-000000000001', 'Dairy', 'Milk', 'dairy', 'Fresh milk, paneer, cheeses, yogurts, and butter'),
('c1000000-0000-0000-0000-000000000002', 'Fruits & Vegetables', 'Apple', 'fruits-vegetables', 'Fresh farm produce, leafy greens, and root veggies'),
('c1000000-0000-0000-0000-000000000003', 'Bakery', 'Croissant', 'bakery', 'Artisan breads, whole wheat loaves, buns, and crusts'),
('c1000000-0000-0000-0000-000000000004', 'Grains & Pasta', 'Wheat', 'grains', 'Basmati rice, pasta, flours, and nutritious cereals'),
('c1000000-0000-0000-0000-000000000005', 'Snacks', 'Cookie', 'snacks', 'Crunchy biscuits, healthy chips, and gourmet treats'),
('c1000000-0000-0000-0000-000000000006', 'Beverages', 'Coffee', 'beverages', 'Artisan coffees, refreshing teas, and cold pressed juices'),
('c1000000-0000-0000-0000-000000000007', 'Staples & Oils', 'Flame', 'staples', 'Pure extra virgin oils, sauces, spices, and seasonings'),
('c1000000-0000-0000-0000-000000000008', 'Personal Care', 'Sparkles', 'personal-care', 'Soaps, handwashes, shampoos, and hygiene essentials')
ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO products (id, category_id, name, brand, description, price, original_price, weight_or_volume, image_url, aisle, shelf_location, nutrition, tags, rating, reviews_count, is_organic) VALUES
('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Amul Fresh Paneer', 'Amul', 'Soft and fresh malai paneer, rich in protein. Perfect for butter paneer, palak paneer, and tikkas.', 85.00, 95.00, '200g', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80', 'Aisle 4', 'Shelf B2 - Chilled Section', '{"calories": 265, "protein": "18g", "fat": "20g", "carbs": "4g", "serving_size": "100g"}', ARRAY['Fresh', 'High Protein', 'No Preservatives'], 4.8, 1240, false),
('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Fresh Red Tomatoes', 'FarmDirect', 'Vine-ripened, juicy red tomatoes packed with lycopene and vitamin C. Ideal for curries, salads, and pasta sauces.', 40.00, 48.00, '1 kg', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80', 'Aisle 1', 'Produce Bin 4', '{"calories": 18, "protein": "0.9g", "fat": "0.2g", "carbs": "3.9g", "serving_size": "100g"}', ARRAY['Organic', 'Farm Fresh', 'High Vitamin C'], 4.6, 890, true),
('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Nashik Red Onions', 'FarmDirect', 'Pungent, crispy, high-quality onions sourced directly from Nashik farms. Essential base for gravies.', 30.00, 35.00, '1 kg', 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80', 'Aisle 2', 'Produce Bin 1', '{"calories": 40, "protein": "1.1g", "fat": "0.1g", "carbs": "9.3g", "serving_size": "100g"}', ARRAY['Pungent', 'Farm Fresh', 'Essential'], 4.5, 620, false),
('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Borges Whole Wheat Penne Rigate', 'Borges', '100% durum wheat semolina Italian penne rigate pasta. Rich in fiber and delicious al dente texture.', 60.00, 75.00, '500g', 'https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&auto=format&fit=crop&q=80', 'Aisle 3', 'Shelf A3 - Imported Grains', '{"calories": 350, "protein": "12g", "fat": "1.5g", "carbs": "72g", "serving_size": "100g"}', ARRAY['Imported', '100% Durum', 'High Fiber'], 4.7, 750, false),
('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000007', 'Figaro Extra Virgin Olive Oil', 'Figaro', 'Cold-extracted extra virgin olive oil from Spain. Excellent for sautéing, pasta dressings, and dips.', 450.00, 520.00, '500ml', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80', 'Aisle 3', 'Shelf C1 - Gourmet Oils', '{"calories": 884, "protein": "0g", "fat": "100g", "carbs": "0g", "serving_size": "100ml"}', ARRAY['Cold Pressed', 'Heart Healthy', 'Spanish'], 4.9, 430, true),
('p1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'Amul Processed Cheese Block', 'Amul', 'Rich and creamy processed cheddar cheese block. Melts effortlessly on pasta, pizzas, and toasts.', 135.00, 145.00, '200g', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80', 'Aisle 4', 'Shelf B1 - Chilled Section', '{"calories": 320, "protein": "20g", "fat": "26g", "carbs": "2g", "serving_size": "100g"}', ARRAY['Creamy', 'Melts Easily', 'Calcium Rich'], 4.8, 980, false),
('p1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000002', 'Fresh Organic Garlic', 'OrganicTattva', 'Potent aroma and unbleached organic garlic cloves. Perfect seasoning for Italian and Indian cooking.', 45.00, 50.00, '250g', 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=600&auto=format&fit=crop&q=80', 'Aisle 1', 'Produce Bin 7', '{"calories": 149, "protein": "6.4g", "fat": "0.5g", "carbs": "33g", "serving_size": "100g"}', ARRAY['Organic', 'Aromatic', 'Immunity'], 4.6, 310, true),
('p1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', 'Epigamia Greek Yogurt Natural', 'Epigamia', 'Authentic Greek strained yogurt with zero added sugar and double protein. Silky and refreshing.', 60.00, 65.00, '200g', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80', 'Aisle 4', 'Shelf A2 - Yogurt Rack', '{"calories": 110, "protein": "10g", "fat": "4g", "carbs": "6g", "serving_size": "100g"}', ARRAY['High Protein', 'No Added Sugar', 'Probiotic'], 4.7, 540, false),
('p1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', 'Raw Pressery Almond Milk Unsweetened', 'Raw Pressery', '100% plant-based almond milk made from selected California almonds. Lactose-free and vegan.', 180.00, 200.00, '1L', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80', 'Aisle 4', 'Shelf D1 - Plant Milks', '{"calories": 30, "protein": "1g", "fat": "2.5g", "carbs": "1g", "serving_size": "200ml"}', ARRAY['Vegan', 'Lactose Free', 'Keto Friendly'], 4.5, 290, true),
('p1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000004', 'Organic Royal Quinoa', 'TrueElements', 'Gluten-free Andean whole grain quinoa. Complete amino acid profile with all 9 essential proteins.', 220.00, 260.00, '500g', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80', 'Aisle 5', 'Shelf C3 - Superfoods', '{"calories": 368, "protein": "14g", "fat": "6g", "carbs": "64g", "serving_size": "100g"}', ARRAY['Superfood', 'Gluten Free', 'Complete Protein'], 4.8, 380, true),
('p1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', 'Mori-Nu Silken Organic Tofu', 'Mori-Nu', 'Smooth and creamy non-GMO organic silken tofu. Perfect dairy-free paneer alternative.', 140.00, 160.00, '340g', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', 'Aisle 4', 'Shelf D3 - Plant Protein', '{"calories": 85, "protein": "9g", "fat": "4.5g", "carbs": "2g", "serving_size": "100g"}', ARRAY['Organic', 'Vegan', 'Non-GMO'], 4.6, 210, true),
('p1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000003', 'The Health Factory Zero Maida Bread', 'HealthFactory', '100% whole wheat sliced loaf with zero added chemicals, palm oil, or refined maida flour.', 55.00, 60.00, '400g', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', 'Aisle 6', 'Bakery Counter Rack', '{"calories": 240, "protein": "8.5g", "fat": "2.1g", "carbs": "46g", "serving_size": "100g"}', ARRAY['Zero Maida', 'Clean Label', 'Fiber Rich'], 4.7, 720, false)
ON CONFLICT (id) DO NOTHING;

-- Insert Inventory
INSERT INTO inventory (id, product_id, quantity, reorder_threshold, status, max_capacity) VALUES
('i1000000-0000-0000-0000-000000000001', 'p1000000-0000-0000-0000-000000000001', 0, 15, 'out_of_stock', 60), -- Paneer currently out of stock (urgent restock needed!)
('i1000000-0000-0000-0000-000000000002', 'p1000000-0000-0000-0000-000000000002', 5, 20, 'low_stock', 80),    -- Tomatoes running low
('i1000000-0000-0000-0000-000000000003', 'p1000000-0000-0000-0000-000000000003', 38, 15, 'in_stock', 80),
('i1000000-0000-0000-0000-000000000004', 'p1000000-0000-0000-0000-000000000004', 24, 10, 'in_stock', 50),
('i1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000005', 18, 5, 'in_stock', 30),
('i1000000-0000-0000-0000-000000000006', 'p1000000-0000-0000-0000-000000000006', 14, 10, 'in_stock', 40),
('i1000000-0000-0000-0000-000000000007', 'p1000000-0000-0000-0000-000000000007', 22, 10, 'in_stock', 40),
('i1000000-0000-0000-0000-000000000008', 'p1000000-0000-0000-0000-000000000008', 2, 12, 'low_stock', 35),
('i1000000-0000-0000-0000-000000000009', 'p1000000-0000-0000-0000-000000000009', 2, 8, 'low_stock', 25),
('i1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000010', 5, 10, 'low_stock', 30),
('i1000000-0000-0000-0000-000000000011', 'p1000000-0000-0000-0000-000000000011', 4, 10, 'low_stock', 25),
('i1000000-0000-0000-0000-000000000012', 'p1000000-0000-0000-0000-000000000012', 19, 10, 'in_stock', 40)
ON CONFLICT (id) DO NOTHING;

-- Insert Checkout Queues (Counter 3 congested, Counter 4 closed as in Screen 15)
INSERT INTO checkout_queues (id, counter_number, customer_count, estimated_wait_mins, status, operator_name) VALUES
('q1000000-0000-0000-0000-000000000001', 1, 2, 1.0, 'open', 'Ramesh K.'),
('q1000000-0000-0000-0000-000000000002', 2, 5, 4.0, 'open', 'Sunita P.'),
('q1000000-0000-0000-0000-000000000003', 3, 8, 7.0, 'congested', 'Priya M.'),
('q1000000-0000-0000-0000-000000000004', 4, 0, 0.0, 'closed', 'Unassigned')
ON CONFLICT (id) DO NOTHING;
