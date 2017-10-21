CREATE TABLE join_products_warehouses(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  warehouse_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED DEFAULT 0,
  FOREIGN KEY `product_id` 
    REFERENCES `products`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  FOREIGN KEY `warehouse_id` 
    REFERENCES `warehouses`(`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  INDEX `i_product_id` (`product_id`),
  INDEX `i_warehouse_id` (`warehouse_id`),
  PRIMARY_KEY (`id`)
);