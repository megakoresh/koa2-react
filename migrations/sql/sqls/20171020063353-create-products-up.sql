CREATE TABLE products(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  # Must set double precision manually, otherwise direct comparison with javascript numbers will not work due to float precision difference:
  # js 4.34, mdb 4.340005323211.... This does not matter when using prepared queries over binary protocol because the number will typecast to
  # database equivalent anyway, just like on insert, but when the number is string-encoded, database will compare it exactly as passed:
  # 4.34000000000000 = 4.340005323211.... which is of course not the case. 3 is a safe bet, since the database seems to not care about low precision like this
  # this is of course using mysql2/mysql-node. Native client doesn't have this problem, you just use FLOAT there.
  price DOUBLE(8,3) NOT NULL,
  description TEXT,  
  UNIQUE INDEX id (id),
  PRIMARY KEY (id)
)
CHARACTER SET 'utf8'
#enables canse insensitive search on text fields using LIKE
COLLATE 'utf8_general_ci';