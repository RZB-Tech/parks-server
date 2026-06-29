declare interface RouteWithData<T> {
  Body: T;
}

declare interface RouteWithQuery<T> {
  Querystring: T;
}

declare interface RouteWithParams<T> {
  Params: T;
}

declare interface ReqData<T> {
  data: T;
}

declare interface SingleIDParam<T> {
  id: T;
}

declare interface RouteWithHeadersAndData<H, T> {
  Headers: H;
  Body: T;
}

declare interface RouteWithHeadersAndQuery<H, T> {
  Headers: H;
  Querystring: T;
}

declare interface RouteWithHeadersParamsAndData<H, T, B> {
  Headers: H;
  Params: T;
  Body: B;
}

declare interface RouteWithHeadersParamsAndQuery<H, T, Q> {
  Headers: H;
  Params: T;
  Querystring: Q;
}

declare interface RouteWithHeaders<H> {
  Headers: H;
}

declare interface RouteWithParamsAndData<T, B> {
  Params: T;
  Body: B;
}

declare interface RouteWithParamsAndQuery<T, Q> {
  Params: T;
  Querystring: Q;
}

declare interface RouteWithParamsAndHeaders<T, H> {
  Params: T;
  Headers: H;
}

export interface AuthHeaders {
  authorization: string;
}

declare interface EmployeeHeaders {
  "employee-id": number;
}