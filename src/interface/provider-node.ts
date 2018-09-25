import { ParsedUrlQuery } from 'querystring';
import { Url } from 'url';

export interface ProviderNode extends Url {
    meta: ParsedUrlQuery;
}