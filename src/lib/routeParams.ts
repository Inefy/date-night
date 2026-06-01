export type RouteParamValue = string | string[] | undefined;

export function getFirstRouteParam(value: RouteParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isSafeReturnPath(value: string | undefined): value is string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  return !/[\\\r\n\t]/.test(value);
}

export function getSafeReturnPath(value: RouteParamValue, fallback = '/tabs/home') {
  const path = getFirstRouteParam(value);

  return isSafeReturnPath(path) ? path : fallback;
}
