export const APP_NAME = 'Academic Impact Explorer';
export const API_URL = 'http://localhost:3030/v1';
export const STORE_URL = 'https://tmp-borza-public-cyx.s3.amazonaws.com/quercus-basis-v2-xlarge'
//export const STORE_URL = 'http://0.0.0.0:8000';

export const INSTITUTION_TYPE = 'Institution';
export const CONCEPT_TYPE = 'Concept';
export const SUBCONCEPT_TYPE = 'SubConcept'
export const CONTINENT_TYPE = 'Continent';
export const COUNTRY_TYPE = 'Country';

export const GLOBAL_BASE_TYPE = 'Global'

export type EntityType = typeof INSTITUTION_TYPE | typeof CONCEPT_TYPE | typeof SUBCONCEPT_TYPE | typeof CONTINENT_TYPE | typeof COUNTRY_TYPE;

export const DEFAULT_LIMIT_N = 10;


//const apiUrl = 'https://borza.ddns.net:8080/v1';
