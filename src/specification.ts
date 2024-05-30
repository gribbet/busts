import type { Type } from "./type";
import { type Any, type Find, type Index } from "./util";

export type Services = { [name: string]: ServiceDefinition<Any, Any> };

export type ServiceName<S extends Services> = keyof S;
type ServiceRequestDefinition<S extends Services> =
  S[ServiceName<S>]["request"];
type ServiceResponseDefinition<S extends Services> =
  S[ServiceName<S>]["response"];

export type ServiceRequest<
  S extends Services,
  Name extends ServiceName<S>,
> = Type<Index<Index<Find<S, "name", Name>, Name>, "request">>;

export type ServiceResponse<
  S extends Services,
  Name extends ServiceName<S>,
> = Type<Index<Index<Find<S, "name", Name>, Name>, "response">>;

export const serviceFromName = <S extends Services>(
  services: S,
  name: ServiceName<S>,
) =>
  services.find(
    (
      _,
    ): _ is ServiceDefinition<
      ServiceName<S>,
      ServiceRequestDefinition<S>,
      ServiceResponseDefinition<S>
    > => _.name === name,
  )!;

export const serviceNameFromSignature = <S extends Services>(
  services: S,
  signature: bigint,
) => services.find(_ => _.signature === signature)?.name;

export const requestType = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
) => serviceFromName(services, name).request;

export const responseType = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
) => serviceFromName(services, name).response;

export const decodeRequest = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
  payload: Uint8Array,
) => requestType(services, name).decode(payload);

export const encodeRequest = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
  request: ServiceRequest<S, Name>,
) => requestType(services, name).encode(request);

export const decodeResponse = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
  payload: Uint8Array,
) => responseType(services, name).decode(payload);

export const encodeResponse = <S extends Services, Name extends ServiceName<S>>(
  services: S,
  name: Name,
  request: ServiceResponse<S, Name>,
) => responseType(services, name).encode(request);

export type ServiceDefinition<
  Request extends Type<Any>,
  Response extends Type<Any>,
> = {
  request: Request;
  response: Response;
};
