-- Kategorie „Wärmepumpe“ in UI/Formularen als „Heizung“
UPDATE assets SET category = 'Heizung' WHERE category = 'Wärmepumpe';
