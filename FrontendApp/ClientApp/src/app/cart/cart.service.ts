import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {ICart, ICartItem, Cart, ICartTotals} from '../shared/Interfaces/cart';
import { InterfaceProduct } from '../shared/Interfaces/product';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  //setting up base url
  baseUrl = environment.apiUrl;

  //it will always emit initial value regardless it is null
  private cartSource = new BehaviorSubject<ICart>(null);

  //To make accessible above observable 
  cart$ = this.cartSource.asObservable();

  private cartTotalSource = new BehaviorSubject<ICartTotals>(null);

  cartTotal$ = this.cartTotalSource.asObservable();
  shipping = 0;
  
  // injecting http client
  constructor(private http: HttpClient) { }

  //This is will get cart item based on ID
  getCart(id: string){
    return this.http.get(this.baseUrl + 'cart?id=' + id)
     //use an RxJS reactive pipe (or data stream) to reshape the structure of data coming from the external API
    .pipe(
      map((cart: ICart) => {
        this.cartSource.next(cart);
        this.calculateTotals();
      })
    );
  }

  
  setCart(cart: ICart){
    return this.http.post(this.baseUrl + 'cart', cart).subscribe((response: ICart) => {
      this.cartSource.next(response);
      this.calculateTotals();
    }, error => {
      console.log(error);
    });
  }

  //get current value in cart without subscribing anything. Helper method
  getCurrentCartValue() {
    //whatever exist in current source it will return
    return this.cartSource.value;
  }

  addItemToCart(item: InterfaceProduct, quantity = 1) {
    const itemToAdd: ICartItem = this.mapProductItemToCartItem(item, quantity);
    const cart = this.getCurrentCartValue() ?? this.createCart();
    cart.items = this.addOrUpdateItem(cart.items, itemToAdd, quantity);
    this.setCart(cart);
  }

  incrementItemQuantity(item: ICartItem) {
    const cart = this.getCurrentCartValue();
    const foundItemIndex = cart.items.findIndex(x => x.id === item.id);
    cart.items[foundItemIndex].quantity++;
    this.setCart(cart);
  }

  decrementItemQuantity(item: ICartItem) {
    const cart = this.getCurrentCartValue();
    const foundItemIndex = cart.items.findIndex(x => x.id === item.id);
    if (cart.items[foundItemIndex].quantity > 1) {
      cart.items[foundItemIndex].quantity--;
      this.setCart(cart);
    } else {
      this.removeItemFromCart(item);
    }
  }

  removeItemFromCart(item: ICartItem) {
    const cart = this.getCurrentCartValue();
    if (cart.items.some(x => x.id === item.id)) {
      cart.items = cart.items.filter(i => i.id !== item.id);
      if (cart.items.length > 0) {
        this.setCart(cart);
      } else {
        this.deleteCart(cart);
      }
    }
  }

  deleteLocalCart(id: string) {
    this.cartSource.next(null);
    this.cartTotalSource.next(null);
    localStorage.removeItem('cart_id');
  }

  deleteCart(cart: ICart) {
    return this.http.delete(this.baseUrl + 'cart?id=' + cart.id).subscribe(() => {
      this.cartSource.next(null);
      this.cartTotalSource.next(null);
      localStorage.removeItem('cart_id');
    }, error => {
      console.log(error);
    });
  }

  private calculateTotals() {
    const cart = this.getCurrentCartValue();
    const shipping = this.shipping;
    const subtotal = cart.items.reduce((a, b) => (b.price * b.quantity) + a, 0);
    const total = subtotal + shipping;
    this.cartTotalSource.next({ shipping, total, subtotal });
  }


  private addOrUpdateItem(items: ICartItem[], itemToAdd: ICartItem, quantity: number): ICartItem[] {
    console.log(items);
    const index = items.findIndex(i => i.id === itemToAdd.id);
    if (index === -1) {
      itemToAdd.quantity = quantity;
      items.push(itemToAdd);
    } else {
      items[index].quantity += quantity;
    }
    return items;
  }

  private createCart(): ICart {
    const cart = new Cart();
    localStorage.setItem('cart_id', cart.id);
    return cart;
  }

  private mapProductItemToCartItem(item: InterfaceProduct, quantity: number): ICartItem {
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      pictureUrl: item.pictureUrl,
      quantity,
      productBrand: item.productBrand,
      productType: item.productType
    };
}

}