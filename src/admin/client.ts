/// <reference path="../common/models.ts" />
/// <reference path="../common/messaging.ts"/>
/// <reference path="shared_directives.ts"/>
/// <reference path="wallet-position.ts"/>
/// <reference path="market-quoting.ts"/>
/// <reference path="market-trades.ts"/>
/// <reference path="trade-safety.ts"/>
/// <reference path="orders.ts"/>
/// <reference path="trades.ts"/>
/// <reference path="pair.ts"/>

import 'zone.js';
import 'reflect-metadata';

(<any>global).jQuery = require("jquery");

import {NgModule, NgZone, Component, Inject, OnInit, OnDestroy, enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {AgGridModule} from 'ag-grid-ng2/main';
import {PopoverModule} from "ng2-popover";

import moment = require("moment");

import Models = require('../common/models');
import Messaging = require('../common/messaging');
import {SharedModule, FireFactory, SubscriberFactory, BaseCurrencyCellComponent, QuoteCurrencyCellComponent} from './shared_directives';
import Pair = require('./pair');
import {WalletPositionComponent} from './wallet-position';
import {MarketQuotingComponent} from './market-quoting';
import {MarketTradesComponent} from './market-trades';
import {TradeSafetyComponent} from './trade-safety';
import {OrdersComponent} from './orders';
import {TradesComponent} from './trades';

class DisplayOrder {
  side : string;
  price : number;
  quantity : number;
  timeInForce : string;
  orderType : string;

  availableSides : string[];
  availableTifs : string[];
  availableOrderTypes : string[];

  private static getNames<T>(enumObject : T) {
    var names: string[] = [];
    for (var mem in enumObject) {
      if (!enumObject.hasOwnProperty(mem)) continue;
      if (parseInt(mem, 10) >= 0) {
        names.push(String(enumObject[mem]));
      }
    }
    return names;
  }

  private _fire: Messaging.IFire<Models.OrderRequestFromUI>;

  constructor(
    fireFactory: FireFactory
  ) {
    this.availableSides = DisplayOrder.getNames(Models.Side);
    this.availableTifs = DisplayOrder.getNames(Models.TimeInForce);
    this.availableOrderTypes = DisplayOrder.getNames(Models.OrderType);
    this._fire = fireFactory.getFire(Messaging.Topics.SubmitNewOrder);
  }

  public submit = () => {
    if (!this.side || !this.price || !this.quantity || !this.timeInForce || !this.orderType) return;
    var msg = new Models.OrderRequestFromUI(this.side, this.price, this.quantity, this.timeInForce, this.orderType);
    this._fire.fire(msg);
  };
}

@Component({
  selector: 'ui',
  template: `<div>
    <div *ngIf="!connected">
        Not connected
    </div>

    <div *ngIf="connected">
        <div class="navbar navbar-default" role="navigation">
            <div class="container-fluid">
                <div class="navbar-header">
                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target=".navbar-collapse">
                        <span class="icon-bar"></span>
                    </button>
                    <a class="navbar-brand" href="#" (click)="changeTheme()">tribeca</a> <small title="Memory Used" style="margin-top: 6px;display: inline-block;">{{ memory }}</small>
                </div>
                <div class="navbar-collapse collapse">
                    <ul class="nav navbar-nav navbar-right">
                        <li><p class="navbar-text"><trade-safety></trade-safety></p></li>
                        <li>
                            <button type="button"
                                    class="btn btn-primary navbar-btn"
                                    id="order_form"
                                    [popover]="myPopover">Submit order
                            </button>
                            <popover-content #myPopover
                                    placement="bottom"
                                    [animation]="true"
                                    [closeOnClickOutside]="true">
                                    <div class="text-center">
                                      <div class="form-group">
                                          <label>Side</label>
                                          <select class="form-control input-sm" [(ngModel)]="order.side">
                                            <option *ngFor="let option of order.availableSides" [ngValue]="option">{{option}}</option>
                                          </select>
                                      </div>
                                      <div class="form-group">
                                          <label>Price</label>
                                          <input class="form-control input-sm" type="number" [(ngModel)]="order.price" />
                                      </div>
                                      <div class="form-group">
                                          <label>Size</label>
                                          <input class="form-control input-sm" type="number" [(ngModel)]="order.quantity" />
                                      </div>
                                      <div class="form-group">
                                          <label>TIF</label>
                                          <select class="form-control input-sm" [(ngModel)]="order.timeInForce">
                                            <option *ngFor="let option of order.availableTifs" [ngValue]="option">{{option}}</option>
                                          </select>
                                      </div>
                                      <div class="form-group">
                                          <label>Type</label>
                                          <select class="form-control input-sm" [(ngModel)]="order.orderType">
                                            <option *ngFor="let option of order.availableOrderTypes" [ngValue]="option">{{option}}</option>
                                          </select>
                                      </div>
                                      <button type="button"
                                          class="btn btn-success"
                                          (click)="myPopover.hide()"
                                          (click)="order.submit()">Submit</button>
                                    </div>
                            </popover-content>
                        </li>
                        <li>
                            <button type="button"
                                    class="btn btn-danger navbar-btn"
                                    (click)="cancelAllOrders()"
                                    data-placement="bottom">Cancel All Open Orders
                            </button>
                        </li>
                        <li>
                            <button type="button"
                                    class="btn btn-info navbar-btn"
                                    (click)="cleanAllClosedOrders()"
                                    *ngIf="[6,7].indexOf(pair.quotingParameters.display.mode)>-1"
                                    data-placement="bottom">Clean All Closed Pongs
                            </button>
                        </li>
                        <li>
                            <button type="button"
                                    class="btn btn-danger navbar-btn"
                                    (click)="cleanAllOrders()"
                                    *ngIf="[5,6,7].indexOf(pair.quotingParameters.display.mode)>-1"
                                    data-placement="bottom">Clean All Open Pings
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="container-fluid">
            <div>
                <div style="padding: 5px" [ngClass]="pair.connected ? 'bg-success img-rounded' : 'bg-danger img-rounded'">
                    <div class="row">
                        <div class="col-md-1 col-xs-12 text-center">
                            <div class="row img-rounded exchange">
                                <button class="col-md-12 col-xs-3" [ngClass]="pair.active.getClass()" (click)="pair.active.submit()">
                                    {{ pair_name }}
                                </button>
                                <h4 style="font-size: 20px" class="col-md-12 col-xs-3">{{ exch_name }}</h4>
                                <wallet-position></wallet-position>
                            </div>
                        </div>
                        <div class="col-md-3 col-xs-12">
                            <market-quoting></market-quoting>
                        </div>
                        <div class="col-md-6 col-xs-12">
                            <order-list></order-list>
                        </div>
                        <div class="col-md-2 col-xs-12">
                            <market-trades></market-trades>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-12 col-xs-12">
                            <div class="row">
                                <table class="table table-responsive table-bordered">
                                    <thead>
                                        <tr class="active">
                                            <th>mode</th>
                                            <th *ngIf="pair.quotingParameters.display.mode==7">bullets</th>
                                            <th *ngIf="pair.quotingParameters.display.mode==7">magazine</th>
                                            <th *ngIf="[5,6,7].indexOf(pair.quotingParameters.display.mode)>-1">pingAt</th>
                                            <th *ngIf="[5,6,7].indexOf(pair.quotingParameters.display.mode)>-1">pongAt</th>
                                            <th>fv</th>
                                            <th>apMode</th>
                                            <th>width</th>
                                            <th>bidSz</th>
                                            <th>askSz</th>
                                            <th>tbp</th>
                                            <th>pDiv</th>
                                            <th>ewma?</th>
                                            <th>apr?</th>
                                            <th>trds</th>
                                            <th>/sec</th>
                                            <th>audio?</th>
                                            <th colspan="2">
                                                <span *ngIf="!pair.quotingParameters.pending && pair.quotingParameters.connected" class="text-success">
                                                    Applied
                                                </span>
                                                <span *ngIf="pair.quotingParameters.pending && pair.quotingParameters.connected" class="text-warning">
                                                    Pending
                                                </span>
                                                <span *ngIf="!pair.quotingParameters.connected" class="text-danger">
                                                    Not Connected
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr class="active">
                                            <td style="width:121px;">
                                                <select class="form-control input-sm"
                                                  [(ngModel)]="pair.quotingParameters.display.mode">
                                                  <option *ngFor="let option of pair.quotingParameters.availableQuotingModes" [ngValue]="option.val">{{option.str}}</option>
                                                </select>
                                            </td>
                                            <td style="width:78px;" *ngIf="pair.quotingParameters.display.mode==7">
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.bullets">
                                            </td>
                                            <td style="width:121px;" *ngIf="pair.quotingParameters.display.mode==7">
                                                <select class="form-control input-sm"
                                                   [(ngModel)]="pair.quotingParameters.display.magazine">
                                                   <option *ngFor="let option of pair.quotingParameters.availableMagazine" [ngValue]="option.val">{{option.str}}</option>
                                                 </select>
                                            </td>
                                            <td style="width:142px;" *ngIf="[5,6,7].indexOf(pair.quotingParameters.display.mode)>-1">
                                                <select class="form-control input-sm"
                                                   [(ngModel)]="pair.quotingParameters.display.pingAt">
                                                   <option *ngFor="let option of pair.quotingParameters.availablePingAt" [ngValue]="option.val">{{option.str}}</option>
                                                </select>
                                            </td>
                                            <td style="width:148px;" *ngIf="[5,6,7].indexOf(pair.quotingParameters.display.mode)>-1">
                                                <select class="form-control input-sm"
                                                   [(ngModel)]="pair.quotingParameters.display.pongAt">
                                                   <option *ngFor="let option of pair.quotingParameters.availablePongAt" [ngValue]="option.val">{{option.str}}</option>
                                                </select>
                                            </td>
                                            <td style="width:88px;">
                                                <select class="form-control input-sm"
                                                    [(ngModel)]="pair.quotingParameters.display.fvModel">
                                                   <option *ngFor="let option of pair.quotingParameters.availableFvModels" [ngValue]="option.val">{{option.str}}</option>
                                                </select>
                                            </td>
                                            <td style="width:121px;">
                                                <select class="form-control input-sm"
                                                    [(ngModel)]="pair.quotingParameters.display.autoPositionMode">
                                                   <option *ngFor="let option of pair.quotingParameters.availableAutoPositionModes" [ngValue]="option.val">{{option.str}}</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input class="width-option form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.width">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.buySize">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.sellSize">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.targetBasePosition">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.positionDivergence">
                                            </td>
                                            <td>
                                                <input type="checkbox"
                                                   [(ngModel)]="pair.quotingParameters.display.ewmaProtection">
                                            </td>
                                            <td>
                                                <input type="checkbox"
                                                   [(ngModel)]="pair.quotingParameters.display.aggressivePositionRebalancing">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.tradesPerMinute">
                                            </td>
                                            <td>
                                                <input class="form-control input-sm"
                                                   type="number"
                                                   onClick="this.select()"
                                                   [(ngModel)]="pair.quotingParameters.display.tradeRateSeconds">
                                            </td>
                                            <td>
                                                <input type="checkbox"
                                                   [(ngModel)]="pair.quotingParameters.display.audio">
                                            </td>
                                            <td>
                                                <input class="btn btn-default btn col-md-1 col-xs-6"
                                                    style="width:55px"
                                                    type="button"
                                                    (click)="pair.quotingParameters.reset()"
                                                    value="Reset" />
                                            </td>
                                            <td>
                                                <input class="btn btn-default btn col-md-1 col-xs-6"
                                                    style="width:50px"
                                                    type="submit"
                                                    (click)="pair.quotingParameters.submit()"
                                                    value="Save" />
                                            </td>
                                        </tr>
                                    </tbody>

                                </table>
                            </div>

                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-5 col-xs-12">
                        </div>
                        <div class="col-md-6 col-xs-12">
                            <trade-list></trade-list>
                        </div>
                        <div class="col-md-1 col-xs-12">
                          <textarea [(ngModel)]="notepad" (ngModelChange)="changeNotepad(notepad)" placeholder="ephemeral notepad" class="ephemeralnotepad" style="height:273px;width: 100%;max-width: 100%;"></textarea>
                      </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <address class="text-center">
      <small>
        <a href="/view/README.md" target="_blank">README</a> - <a href="/view/MANUAL.md" target="_blank">MANUAL</a> - <a title="irc://irc.domirc.net:6667/##tradingBot" href="irc://irc.domirc.net:6667/##tradingBot">IRC</a>
      </small>
    </address>
  </div>`
})
class ClientComponent implements OnInit, OnDestroy {

  public memory: string;
  public notepad: string;
  public connected: boolean;
  public order: DisplayOrder;
  public pair: Pair.DisplayPair;
  public exch_name: string;
  public pair_name: string;
  public cancelAllOrders = () => {};
  public cleanAllClosedOrders = () => {};
  public cleanAllOrders = () => {};
  public changeNotepad = (content: string) => {};

  private subscriberProductAdvertisement: any;
  private subscriberApplicationState: any;
  private subscriberNotepad: any;

  private user_theme: string = null;
  private system_theme: string = null;

  constructor(
    @Inject(NgZone) private zone: NgZone,
    @Inject(SubscriberFactory) private subscriberFactory: SubscriberFactory,
    @Inject(FireFactory) private fireFactory: FireFactory
  ) {
    this.cancelAllOrders = () => fireFactory
      .getFire(Messaging.Topics.CancelAllOrders)
      .fire(new Models.CancelAllOrdersRequest());

    this.cleanAllClosedOrders = () => fireFactory
      .getFire(Messaging.Topics.CleanAllClosedOrders)
      .fire(new Models.CleanAllClosedOrdersRequest());

    this.cleanAllOrders = () => fireFactory
      .getFire(Messaging.Topics.CleanAllOrders)
      .fire(new Models.CleanAllOrdersRequest());

    this.changeNotepad = (content:string) => fireFactory
      .getFire(Messaging.Topics.ChangeNotepad)
      .fire(new Models.Notepad(content));

    this.notepad = null;
    this.pair = null;
    this.reset();
  }

  ngOnInit() {
    this.order = new DisplayOrder(this.fireFactory);

    this.subscriberProductAdvertisement = this.subscriberFactory.getSubscriber(this.zone, Messaging.Topics.ProductAdvertisement)
      .registerSubscriber(this.onAdvert, a => a.forEach(this.onAdvert))
      .registerDisconnectedHandler(() => this.reset());

    this.subscriberApplicationState = this.subscriberFactory.getSubscriber(this.zone, Messaging.Topics.ApplicationState)
      .registerSubscriber(this.onAppState, a => a.forEach(this.onAppState))
      .registerDisconnectedHandler(() => this.reset());

    this.subscriberNotepad = this.subscriberFactory.getSubscriber(this.zone, Messaging.Topics.Notepad)
      .registerSubscriber(this.onNotepad, a => a.forEach(this.onNotepad))
      .registerDisconnectedHandler(() => this.reset());
  }

  ngOnDestroy() {
    this.subscriberProductAdvertisement.disconnect();
    this.subscriberApplicationState.disconnect();
    this.subscriberNotepad.disconnect();
  }

  private onNotepad = (np : Models.Notepad) => {
    this.notepad = np ? np.content : "";
  }

  private reset = () => {
    this.connected = false;
    this.pair_name = null;
    this.exch_name = null;

    if (this.pair !== null)
      this.pair.dispose();
    this.pair = null;
  }

  private unit = ['', 'K', 'M', 'G', 'T', 'P'];

  private bytesToSize = (input:number, precision:number) => {
    var index = Math.floor(Math.log(input) / Math.log(1024));
    if (index >= this.unit.length) return input + 'B';
    return (input / Math.pow(1024, index)).toFixed(precision) + this.unit[index] + 'B'
  }

  private onAppState = (as : Models.ApplicationState) => {
    this.memory = this.bytesToSize(as.memory, 3);
    this.system_theme = this.getTheme(as.hour);
    this.setTheme();
  }

  private setTheme = () => {
    if (jQuery('#daynight').attr('href')!='/css/bootstrap-theme'+this.system_theme+'.min.css')
      jQuery('#daynight').attr('href', '/css/bootstrap-theme'+this.system_theme+'.min.css');
  }

  public changeTheme = () => {
    this.user_theme = this.user_theme!==null?(this.user_theme==''?'-dark':''):(this.system_theme==''?'-dark':'');
    this.system_theme = this.user_theme;
    this.setTheme();
  }

  private getTheme = (hour: number) => {
    return this.user_theme!==null?this.user_theme:((hour<9 || hour>=21)?'-dark':'');
  }

  private onAdvert = (pa : Models.ProductAdvertisement) => {
    this.connected = true;
    window.document.title = 'tribeca ['+pa.environment+']';
    this.system_theme = this.getTheme(moment.utc().hours());
    this.setTheme();
    this.pair_name = Models.Currency[pa.pair.base] + "/" + Models.Currency[pa.pair.quote];
    this.exch_name = Models.Exchange[pa.exchange];
    this.pair = new Pair.DisplayPair(this.zone, this.subscriberFactory, this.fireFactory);
  }
}

@NgModule({
  imports: [
    SharedModule,
    BrowserModule,
    FormsModule,
    PopoverModule,
    AgGridModule.withComponents([
      BaseCurrencyCellComponent,
      QuoteCurrencyCellComponent
    ])
  ],
  declarations: [
    ClientComponent,
    OrdersComponent,
    TradesComponent,
    MarketQuotingComponent,
    MarketTradesComponent,
    WalletPositionComponent,
    TradeSafetyComponent,
    BaseCurrencyCellComponent,
    QuoteCurrencyCellComponent
  ],
  bootstrap: [ClientComponent]
})
class ClientModule {}

enableProdMode();
platformBrowserDynamic().bootstrapModule(ClientModule);
