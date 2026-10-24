/**
 * SQL statements for the inventory management system.
 * Includes table creation, item/location searches, and movement history.
 */

/**
 * Creates the locations table, supporting nested storage locations.
 */
export const CREATE_LOCATIONS_TABLE = `
CREATE TABLE locations (
    location_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    parent_location_id INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_location_parent
        FOREIGN KEY (parent_location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT
);
`;

/**
 * Creates the inventory items table.
 */
export const CREATE_INVENTORY_ITEMS_TABLE = `
CREATE TABLE inventory_items (
    item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    sku VARCHAR(100) NULL UNIQUE,
    barcode VARCHAR(150) NULL UNIQUE,

    location_id INT UNSIGNED NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_item_location
        FOREIGN KEY (location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT,

    INDEX idx_item_name (name),
    INDEX idx_item_location (location_id)
);
`;

/**
 * Creates the inventory movement history table.
 */
export const CREATE_INVENTORY_MOVEMENTS_TABLE = `
CREATE TABLE inventory_movements (
    movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNSIGNED NOT NULL,

    from_location_id INT UNSIGNED NULL,
    to_location_id INT UNSIGNED NULL,

    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,

    CONSTRAINT fk_movement_item
        FOREIGN KEY (item_id)
        REFERENCES inventory_items(item_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movement_from
        FOREIGN KEY (from_location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movement_to
        FOREIGN KEY (to_location_id)
        REFERENCES locations(location_id)
        ON DELETE RESTRICT,

    INDEX idx_movement_item_date (item_id, moved_at)
);
`;

/**
 * Searches inventory items by name or description.
 * Parameter: searchTerm
 */
export const SEARCH_INVENTORY_ITEMS = `
SELECT
    i.item_id,
    i.name,
    i.description,
    i.sku,
    i.barcode,
    i.quantity,
    l.location_id,
    l.location_code,
    l.name AS location_name
FROM inventory_items AS i
LEFT JOIN locations AS l
    ON i.location_id = l.location_id
WHERE
    i.name LIKE ?
    OR i.description LIKE ?
ORDER BY i.name ASC;
`;

/**
 * Retrieves all inventory items at a specified location code.
 * Parameter: locationCode
 */
export const GET_ITEMS_BY_LOCATION = `
SELECT
    i.item_id,
    i.name,
    i.description,
    i.sku,
    i.barcode,
    i.quantity,
    l.location_code
FROM locations AS l
JOIN inventory_items AS i
    ON i.location_id = l.location_id
WHERE l.location_code = ?
ORDER BY i.name ASC;
`;

/**
 * Finds an inventory item by its barcode.
 * Parameter: barcode
 */
export const GET_ITEM_BY_BARCODE = `
SELECT
    i.item_id,
    i.name,
    i.description,
    i.quantity,
    l.location_code,
    l.name AS location_name
FROM inventory_items AS i
LEFT JOIN locations AS l
    ON i.location_id = l.location_id
WHERE i.barcode = ?;
`;

/**
 * Retrieves the movement history of a specific item.
 * Parameter: itemId
 */
export const GET_ITEM_MOVEMENT_HISTORY = `
SELECT
    m.moved_at,
    m.quantity,
    src.location_code AS from_location,
    dest.location_code AS to_location,
    m.notes
FROM inventory_movements AS m
LEFT JOIN locations AS src
    ON m.from_location_id = src.location_id
LEFT JOIN locations AS dest
    ON m.to_location_id = dest.location_id
WHERE m.item_id = ?
ORDER BY m.moved_at DESC;
`;

/**
 * Retrieves all locations, including their parent location IDs.
 */
export const GET_ALL_LOCATIONS = `
SELECT
    location_id,
    location_code,
    name,
    description,
    parent_location_id
FROM locations
ORDER BY location_code ASC;
`;

/**
 * Retrieves a location by its unique location code.
 * Parameter: locationCode
 */
export const GET_LOCATION_BY_CODE = `
SELECT
    location_id,
    location_code,
    name,
    description,
    parent_location_id
FROM locations
WHERE location_code = ?;
`;

/**
 * Retrieves all inventory items that have not been assigned a location.
 */
export const GET_UNLOCATED_ITEMS = `
SELECT
    item_id,
    name,
    description,
    sku,
    barcode,
    quantity
FROM inventory_items
WHERE location_id IS NULL
ORDER BY name ASC;
`;

/**
 * Updates an item's current location.
 * Parameters: destinationLocationId, itemId
 */
export const UPDATE_ITEM_LOCATION = `
UPDATE inventory_items
SET location_id = ?
WHERE item_id = ?;
`;

/**
 * Records an inventory movement.
 * Parameters: itemId, sourceLocationId, destinationLocationId, quantity, notes
 */
export const INSERT_INVENTORY_MOVEMENT = `
INSERT INTO inventory_movements (
    item_id,
    from_location_id,
    to_location_id,
    quantity,
    notes
)
VALUES (?, ?, ?, ?, ?);
`;

/**
 * Inserts a new inventory item.
 * Parameters: name, description, sku, barcode, locationId, quantity
 */
export const INSERT_INVENTORY_ITEM = `
INSERT INTO inventory_items (
    name,
    description,
    sku,
    barcode,
    location_id,
    quantity
)
VALUES (?, ?, ?, ?, ?, ?);
`;

/**
 * Inserts a new storage location.
 * Parameters: locationCode, name, description, parentLocationId
 */
export const INSERT_LOCATION = `
INSERT INTO locations (
    location_code,
    name,
    description,
    parent_location_id
)
VALUES (?, ?, ?, ?);
`;