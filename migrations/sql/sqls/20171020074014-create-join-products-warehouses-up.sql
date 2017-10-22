CREATE TABLE join_products_warehouses(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  warehouse_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED DEFAULT 0, 
  CONSTRAINT `fk_product_id` 
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
      ON DELETE CASCADE 
      ON UPDATE CASCADE,
  CONSTRAINT `fk_warehouse_id`
    FOREIGN KEY (`warehouse_id`)
      REFERENCES `warehouses` (`id`) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE,
  INDEX `i_product_id` (`product_id`),
  INDEX `i_warehouse_id` (`warehouse_id`),
  PRIMARY KEY (`id`)
);