import * as _User from './User';
import * as _Comment from './Comment';
import * as _Product from './Product';
import * as _Warehouse from './Warehouse';

declare global {
  const User : typeof _User.model;
  const Comment : typeof _Comment.model;
  const Product : typeof _Product.model;
  const Warehouse : typeof _Warehouse.model;
}