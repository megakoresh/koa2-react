CREATE TABLE warehouses(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  address VARCHAR(800) NOT NULL,
  info TEXT,
  UNIQUE INDEX id (id),
  PRIMARY KEY (id)
)
CHARACTER SET 'utf8'
#enables canse insensitive search on text fields using LIKE
COLLATE 'utf8_general_ci';