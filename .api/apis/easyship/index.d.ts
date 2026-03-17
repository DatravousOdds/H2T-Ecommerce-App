import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core';
import Oas from 'oas';
import APICore from 'api/dist/core';
declare class SDK {
    spec: Oas;
    core: APICore;
    constructor();
    /**
     * Optionally configure various options that the SDK allows.
     *
     * @param config Object of supported SDK options and toggles.
     * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
     * should be represented in milliseconds.
     */
    config(config: ConfigOptions): void;
    /**
     * If the API you're using requires authentication you can supply the required credentials
     * through this method and the library will magically determine how they should be used
     * within your API request.
     *
     * With the exception of OpenID and MutualTLS, it supports all forms of authentication
     * supported by the OpenAPI specification.
     *
     * @example <caption>HTTP Basic auth</caption>
     * sdk.auth('username', 'password');
     *
     * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
     * sdk.auth('myBearerToken');
     *
     * @example <caption>API Keys</caption>
     * sdk.auth('myApiKey');
     *
     * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
     * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
     * @param values Your auth credentials for the API; can specify up to two strings or numbers.
     */
    auth(...values: string[] | number[]): this;
    /**
     * If the API you're using offers alternate server URLs, and server variables, you can tell
     * the SDK which one to use with this method. To use it you can supply either one of the
     * server URLs that are contained within the OpenAPI definition (along with any server
     * variables), or you can pass it a fully qualified URL to use (that may or may not exist
     * within the OpenAPI definition).
     *
     * @example <caption>Server URL with server variables</caption>
     * sdk.server('https://{region}.api.example.com/{basePath}', {
     *   name: 'eu',
     *   basePath: 'v14',
     * });
     *
     * @example <caption>Fully qualified server URL</caption>
     * sdk.server('https://eu.api.example.com/v14');
     *
     * @param url Server URL
     * @param variables An object of variables to replace into the server URL.
     */
    server(url: string, variables?: {}): void;
    /**
     * Create a temporary app access redirect token
     *
     * Required authorization scope: `public.app_access:write`
     *
     * @summary Create an App Access
     * @throws FetchError<422, types.AppAccessCreateResponse422> invalid target
     */
    app_access_create(body: types.AppAccessCreateBodyParam): Promise<FetchResponse<201, types.AppAccessCreateResponse201>>;
    /**
     * Activate specific uploaded asset and define other assets of the same type as inactive.
     *
     * Required authorization scope: `public.asset:write`
     *
     * @summary Activate Assets
     */
    asset_activate_create(metadata: types.AssetActivateCreateMetadataParam): Promise<FetchResponse<200, types.AssetActivateCreateResponse200>>;
    /**
     * Deactivate specific uploaded asset.
     *
     * Required authorization scope: `public.asset:write`
     *
     * @summary Deactivate Assets
     */
    asset_deactivate_create(metadata: types.AssetDeactivateCreateMetadataParam): Promise<FetchResponse<200, types.AssetDeactivateCreateResponse200>>;
    /**
     * Retrieve a list of assets.
     *
     * Required authorization scope: `public.asset:read`
     *
     * @summary List all Assets
     */
    assets_index(metadata?: types.AssetsIndexMetadataParam): Promise<FetchResponse<200, types.AssetsIndexResponse200>>;
    /**
     * Create an asset.
     *
     * > You can store up to five assets for each type.
     * > Allowed file types: png or jpeg.
     *
     * Required authorization scope: `public.asset:write`
     *
     * @summary Create an Asset
     * @throws FetchError<400, types.AssetsCreateResponse400> uploaded assets count exceeds limitation
     */
    assets_create(body: types.AssetsCreateBodyParam): Promise<FetchResponse<201, types.AssetsCreateResponse201>>;
    /**
     * Update an asset.
     *
     * Required authorization scope: `public.asset:write`
     *
     * @summary Update an Asset
     * @throws FetchError<404, types.AssetsUpdateResponse404> no record found
     */
    assets_update(body: types.AssetsUpdateBodyParam, metadata: types.AssetsUpdateMetadataParam): Promise<FetchResponse<200, types.AssetsUpdateResponse200>>;
    assets_update(metadata: types.AssetsUpdateMetadataParam): Promise<FetchResponse<200, types.AssetsUpdateResponse200>>;
    /**
     * Delete an asset.
     *
     * Required authorization scope: `public.asset:write`
     *
     * @summary Delete an Asset
     * @throws FetchError<404, types.AssetsDeleteResponse404> no record found
     */
    assets_delete(metadata: types.AssetsDeleteMetadataParam): Promise<FetchResponse<200, types.AssetsDeleteResponse200>>;
    /**
     * Update the settings for auto recharging your credit when your account balance falls
     * below the threshold specified through this endpoint.
     *
     * This endpoint is in beta (subject to change). Please get in touch with customer support
     * to enable it.
     *
     * Required authorization scope: `public.payment:write`
     *
     * @summary Update Auto Recharge Credit Settings
     * @throws FetchError<422, types.CreditAutoRechargeUpdateResponse422> failed validations
     */
    credit_auto_recharge_update(body?: types.CreditAutoRechargeUpdateBodyParam): Promise<FetchResponse<200, types.CreditAutoRechargeUpdateResponse200>>;
    /**
     * Show the auto recharge settings for the company.
     *
     * Required authorization scope: `public.payment:read`
     *
     * @summary Get Auto Recharge Credit Settings
     */
    credit_auto_recharge_show(): Promise<FetchResponse<200, types.CreditAutoRechargeShowResponse200>>;
    /**
     * Easyship integrate with Stripe Payment Intent to collect credit card payments.
     * Ref: https://stripe.com/docs/payments/payment-intents
     *
     * The confirmation process includes the collection of payment and creation of a
     * transaction record (credit) in your account.
     *
     * Should the payment intent not have undergone 3D Secure, you'll receive a status code
     * 202, indicating the need to process 3D Secure.
     *
     * Required authorization scope: `public.payment:write`
     *
     * @summary Confirm Credit Top-up
     * @throws FetchError<422, types.CreditConfrim3DsCreateResponse422> payment intent has been confirmed
     */
    credit_confrim_3ds_create(body: types.CreditConfrim3DsCreateBodyParam): Promise<FetchResponse<201, types.CreditConfrim3DsCreateResponse201> | FetchResponse<202, types.CreditConfrim3DsCreateResponse202>>;
    /**
     * Refund your credit.
     *
     * Required authorization scope: `public.payment:write`
     *
     * @summary Refund a Credit
     * @throws FetchError<422, types.CreditRefundCreateResponse422> insufficient balance
     */
    credit_refund_create(body?: types.CreditRefundCreateBodyParam): Promise<FetchResponse<201, types.CreditRefundCreateResponse201>>;
    /**
     * Retrieve your credit balance.
     *
     * Required authorization scope: `public.credit:read`
     *
     * @summary Get credit
     */
    credits_show(): Promise<FetchResponse<200, types.CreditsShowResponse200>>;
    /**
     * Top up your credit.
     *
     * In case your payment source (credit card) requires 3D validation use the Stripe SDK.
     *
     * To detect any fraudulent activities and initiate Radar and 3D Secure, integrate
     * `handleCardAction` from Stripe.js.
     * Reference: https://stripe.com/docs/js/payment_intents/handle_card_action
     *
     * Example:
     * ```html
     * <script src="https://js.stripe.com/v3/"></script>
     * <script>
     *    // Retrieve Easyship stripe publishable api key through `GET /2024-09/account/stripe`
     *    var stripe = Stripe('stripe_publishable_api_key');
     *
     *    // When `POST /2024-09/account/credit` returns status code 202, retrieve the secret
     * in the response.
     *    var secret = response.action.client_secret
     *
     *    // 3D validation
     *    stripe.handleCardAction(secret).then(function (result) {
     *      if (result.error) {
     *        // error handling
     *      } else {
     *        // You would receive stripe payment_intent object
     *        // `POST /2024-09/account/credit/confirm_3ds` with payment_intent.id to confirm
     * credit top-up
     *      }
     *    });
     *  </script>
     * ```
     *
     * > If you are using an authorized bank account as your payment method, the transaction
     * might take around 1 to 3 days to complete.
     *
     * Required authorization scope: `public.payment:write`
     *
     * @summary Add credit
     * @throws FetchError<404, types.CreditsCreateResponse404> record not found
     */
    credits_create(body: types.CreditsCreateBodyParam): Promise<FetchResponse<201, types.CreditsCreateResponse201> | FetchResponse<202, types.CreditsCreateResponse202>>;
    /**
     * Create a redirect to the Easyship Dashboard.
     *
     * Required authorization scope: `public.redirect:write`
     *
     * @summary Create a Redirect
     * @throws FetchError<422, types.RedirectsCreateResponse422> missing redirect_back_url
     */
    redirects_create(body?: types.RedirectsCreateBodyParam): Promise<FetchResponse<200, types.RedirectsCreateResponse200>>;
    /**
     * Retrieve account settings.
     *
     * Required authorization scope: `public.setting:read`
     *
     * @summary List Account Settings
     */
    settings_index(): Promise<FetchResponse<200, types.SettingsIndexResponse200>>;
    /**
     * Update multiple account settings.
     *
     * Required authorization scope: `public.setting:write`
     *
     * @summary Update Multiple Account Settings
     */
    settings_update(body?: types.SettingsUpdateBodyParam): Promise<FetchResponse<200, types.SettingsUpdateResponse200>>;
    /**
     * Retrieve a stripe public key according to your registration country.
     *
     * Required authorization scope: `public.payment_sources:read`
     *
     * @summary Get a Stripe Public Key
     */
    stripes_show(): Promise<FetchResponse<200, types.StripesShowResponse200>>;
    /**
     * Retrieve information about current account
     *
     * Properties below would display only when the access token includes the corresponding
     * scopes.
     *
     * | Property | Required API Scope |
     * | -------- | ------------------ |
     * | `billing_address` | `public.address:read` |
     * | `credit` | `public.credit:read` |
     * | `payment_sources` | `public.payment_source:read` |
     *
     * @summary Information about the Account
     */
    account_show(): Promise<FetchResponse<200, types.AccountShowResponse200>>;
    /**
     * Activate specific address
     *
     * Required authorization scope: `public.address:write`
     *
     * @summary Activate an Address
     */
    address_activate_create(metadata: types.AddressActivateCreateMetadataParam): Promise<FetchResponse<200, types.AddressActivateCreateResponse200>>;
    /**
     * Deactivate specific address.
     *
     * If the address is default for the company, the first active address will be set as
     * default.
     *
     * Required authorization scope: `public.address:write`
     *
     * @summary Deactivate an Address
     */
    address_deactivate_create(metadata: types.AddressDeactivateCreateMetadataParam): Promise<FetchResponse<200, types.AddressDeactivateCreateResponse200>>;
    /**
     * Create an address validation.
     *
     * Required authorization scope:
     * - `public.address_validation:write` for international addresses.
     * - `public.address_validation_domestic:write` for US addresses.
     *
     * See the [Domestic Address
     * Validation](https://developers.easyship.com/2024-09/addresses/validations_domestic)
     * endpoint for more details.
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Validate a single address
     * @throws FetchError<422, types.AddressesValidationResponse422> invalid request
     */
    addresses_validation(body: types.AddressesValidationBodyParam): Promise<FetchResponse<200, types.AddressesValidationResponse200>>;
    /**
     * Create a domestic address validation for US addresses.
     *
     * This endpoint is specifically for US addresses.
     * The `country_alpha2` parameter is optional and will be ignored if provided.
     *
     * Required authorization scope: `public.address_validation_domestic:write`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Validate a single domestic (US) address
     * @throws FetchError<422, types.AddressesValidationDomesticResponse422> invalid request
     */
    addresses_validation_domestic(body: types.AddressesValidationDomesticBodyParam): Promise<FetchResponse<200, types.AddressesValidationDomesticResponse200>>;
    /**
     * Retrieve a list of all addresses ordered by date of creation.
     *
     * Required authorization scope: `public.address:read`
     *
     * @summary List all Addresses
     */
    addresses_index(metadata?: types.AddressesIndexMetadataParam): Promise<FetchResponse<200, types.AddressesIndexResponse200>>;
    /**
     * Create a new address.
     *
     * Required authorization scope: `public.address:write`
     *
     * @summary Create an Address
     * @throws FetchError<422, types.AddressesCreateResponse422> failed validations
     */
    addresses_create(body: types.AddressesCreateBodyParam): Promise<FetchResponse<201, types.AddressesCreateResponse201>>;
    /**
     * Update an address in your account.
     *
     * Required authorization scope: `public.address:write`
     *
     * @summary Update an Address
     * @throws FetchError<404, types.AddressesUpdateResponse404> record not found
     * @throws FetchError<422, types.AddressesUpdateResponse422> failed validations
     */
    addresses_update(body: types.AddressesUpdateBodyParam, metadata: types.AddressesUpdateMetadataParam): Promise<FetchResponse<200, types.AddressesUpdateResponse200>>;
    /**
     * Retrieve sales analytics.
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Analytics Sale Channels Data
     * @throws FetchError<400, types.AnalyticsSaleChannelsIndexResponse400> failed validations
     */
    analytics_sale_channels_index(metadata: types.AnalyticsSaleChannelsIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsSaleChannelsIndexResponse200>>;
    /**
     * Retrieve shipment status. Possible statuses:
     * - Label Pending
     * - Label Rejected
     * - Label Ready
     * - Pickup/Drop-off in Progress
     * - In Transit to Customer
     * - Failed Delivery Attempt
     * - Exception
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Analytics Shipment Status Data
     * @throws FetchError<400, types.AnalyticsShipmentStatusIndexResponse400> failed validations
     */
    analytics_shipment_status_index(metadata: types.AnalyticsShipmentStatusIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsShipmentStatusIndexResponse200>>;
    /**
     * Retrieve data on whether the company has made any shipments within specified period.
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Shipment Analytics within a Date Range
     * @throws FetchError<400, types.AnalyticsShipmentShippedIndexResponse400> failed validations
     */
    analytics_shipment_shipped_index(metadata: types.AnalyticsShipmentShippedIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsShipmentShippedIndexResponse200>>;
    /**
     * Retrieve analytics shipments data.
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Analytics Shipments Data
     * @throws FetchError<400, types.AnalyticsShipmentsIndexResponse400> failed validations
     */
    analytics_shipments_index(metadata: types.AnalyticsShipmentsIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsShipmentsIndexResponse200>>;
    /**
     * Retrieve analytics top couriers data.
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Analytics Top Couriers Data
     * @throws FetchError<400, types.AnalyticsTopCouriersIndexResponse400> failed validations
     */
    analytics_top_couriers_index(metadata: types.AnalyticsTopCouriersIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsTopCouriersIndexResponse200>>;
    /**
     * Retrieve a company top shipments destinations country.
     *
     * Required authorization scope: `public.analytics:read`
     *
     * @summary List Analytics Top Shipments Destinations
     * @throws FetchError<400, types.AnalyticsTopShipmentsDestinationsIndexResponse400> failed validations
     */
    analytics_top_shipments_destinations_index(metadata: types.AnalyticsTopShipmentsDestinationsIndexMetadataParam): Promise<FetchResponse<200, types.AnalyticsTopShipmentsDestinationsIndexResponse200>>;
    /**
     * Create a batch of addresses.
     *
     * Required authorization scopes: `public.batch:write`, `public.address:write`
     *
     * @summary Create a Batch of Addresses
     * @throws FetchError<422, types.BatchAddressesCreateResponse422> missing params
     */
    batch_addresses_create(body: types.BatchAddressesCreateBodyParam): Promise<FetchResponse<202, types.BatchAddressesCreateResponse202>>;
    /**
     * Retrieve a list of all batches ordered by date of creation.
     *
     * Required authorization scope: `public.batch:read`
     *
     * @summary List all Batch Items
     * @throws FetchError<404, types.BatchItemsIndexResponse404> record not found
     */
    batch_items_index(metadata: types.BatchItemsIndexMetadataParam): Promise<FetchResponse<200, types.BatchItemsIndexResponse200>>;
    /**
     * Create a batch of labels.
     *
     * Required authorization scopes: `public.batch:write`, `public.label:write`
     *
     * Labels confirm a shipment created with the Shipment API. Calling **Batch Labels** will
     * confirm shipments with selected courier service and begin generating the label and
     * shipping documents if your account balance is sufficient.
     *
     * > You can enter a `courier_service_id` to assign a specific courier service in case your
     * shipment has no assigned courier yet, or you need to overwrite the one suggested by
     * default. Your shipment will be confirmed. If there is no assigned courier service and
     * you leave the `courier_service_id` field blank, we will automatically assign the best
     * value for money courier to your shipment.
     *
     * ## Asynchronous response
     *
     * The label and shipping documents will be generated asynchronously. If you specified a
     * `Callback URL` through the Easyship dashboard, this URL will be called when the
     * documents are ready.
     * Whilst these documents are being generated, the `label_state` will be set to `pending`.
     * The possible states are `not_created`, `pending`, `failed` and `generated`.
     *
     * @summary Create a Batch of Labels
     * @throws FetchError<403, types.BatchLabelsCreateResponse403> identity verification required
     * @throws FetchError<422, types.BatchLabelsCreateResponse422> missing params
     */
    batch_labels_create(body: types.BatchLabelsCreateBodyParam): Promise<FetchResponse<202, types.BatchLabelsCreateResponse202>>;
    /**
     * Create a batch of shipments and schedule it for processing.
     *
     * Required authorization scopes: `public.batch:write`, `public.shipment:write` and
     * `public.label:write` if a label(s) will be created during the batch processing.
     *
     * @summary Create a Batch of Shipments
     * @throws FetchError<422, types.BatchShipmentsCreateResponse422> invalid params
     */
    batch_shipments_create(body?: types.BatchShipmentsCreateBodyParam): Promise<FetchResponse<202, types.BatchShipmentsCreateResponse202>>;
    /**
     * Retrieve a list of all batches ordered by date of creation.
     *
     * Required authorization scope: `public.batch:read`
     *
     * @summary List all Batches
     */
    batches_index(metadata?: types.BatchesIndexMetadataParam): Promise<FetchResponse<200, types.BatchesIndexResponse200>>;
    /**
     * Retrieve a batch by its ID.
     *
     * Required authorization scope: `public.batch:read`
     *
     * @summary Get a Batch
     * @throws FetchError<404, types.BatchesShowResponse404> record not found
     */
    batches_show(metadata: types.BatchesShowMetadataParam): Promise<FetchResponse<200, types.BatchesShowResponse200>>;
    /**
     * Download the Billing Document in PDF format.
     *
     * Required authorization scope: `public.billing_document:read`
     *
     * @summary Download Billing Document
     * @throws FetchError<404, types.BillingDocumentsDownloadResponse404> record not found
     */
    billing_documents_download(metadata: types.BillingDocumentsDownloadMetadataParam): Promise<FetchResponse<number, unknown>>;
    /**
     * Retrieve a list of all billing documents within range.
     * Pagination of this endpoint is not indexed.
     * `count` on the response body will always be `null`.
     *
     * Required authorization scope: `public.billing_document:read`
     *
     * @summary List all Billing Documents
     * @throws FetchError<422, types.BillingDocumentsIndexResponse422> failed validations
     */
    billing_documents_index(metadata?: types.BillingDocumentsIndexMetadataParam): Promise<FetchResponse<200, types.BillingDocumentsIndexResponse200>>;
    /**
     * Retrieve a list of available courier boxes and your custom boxes.
     *
     * Required authorization scope: `public.box:read`
     *
     * This request returns box types specified with a `slug` when creating a shipment via the
     * API or dashboard.
     *
     * > In Easyship API terms, `slug` is a string field used by the `box` object. Slugs
     * contain dimensions of corresponding box types: when you create a shipment, we will get
     * dimensions based on the `slug` provided.
     *
     * @summary List all Boxes
     */
    boxes_index(metadata?: types.BoxesIndexMetadataParam): Promise<FetchResponse<200, types.BoxesIndexResponse200>>;
    /**
     * Create a box.
     *
     * Required authorization scope: `public.box:write`
     *
     * @summary Create a Box
     * @throws FetchError<422, types.BoxesCreateResponse422> failed validations
     */
    boxes_create(body?: types.BoxesCreateBodyParam): Promise<FetchResponse<201, types.BoxesCreateResponse201>>;
    /**
     * Update a box in your account.
     *
     * Required authorization scope: `public.box:write`
     *
     * @summary Update a Box
     * @throws FetchError<404, types.BoxesUpdateResponse404> record not found
     */
    boxes_update(body: types.BoxesUpdateBodyParam, metadata: types.BoxesUpdateMetadataParam): Promise<FetchResponse<200, types.BoxesUpdateResponse200>>;
    boxes_update(metadata: types.BoxesUpdateMetadataParam): Promise<FetchResponse<200, types.BoxesUpdateResponse200>>;
    /**
     * Delete a box from your account.
     *
     * Required authorization scope: `public.box:write`
     *
     * @summary Delete a Box
     * @throws FetchError<404, types.BoxesDeleteResponse404> record not found
     */
    boxes_delete(metadata: types.BoxesDeleteMetadataParam): Promise<FetchResponse<200, types.BoxesDeleteResponse200>>;
    /**
     * Retrieve a list of countries.
     *
     * Required authorization scope: `public.reference:read`
     *
     * Available filtering parameters: by Alpha-2 country code or continent.
     *
     * @summary List all Countries
     */
    countries_index(metadata?: types.CountriesIndexMetadataParam): Promise<FetchResponse<200, types.CountriesIndexResponse200>>;
    /**
     * Retrieve a list of estimated delivery dates for a specific courier service.
     *
     * Required authorization scope: `public.courier_service:read`
     *
     * Easyship builds estimation model based on shipments delivered within last 12 months. If
     * you use Link Your Own Rates (LYOC) scheme, LYOC couriers are excluded from the
     * calculation.
     *
     * @summary List all Estimated Delivery Dates for a Courier Service
     * @throws FetchError<404, types.CourierServiceEstimatedDeliveryDatesIndexResponse404> courier not found
     * @throws FetchError<422, types.CourierServiceEstimatedDeliveryDatesIndexResponse422> Invalid origin_country_alpha2
     */
    courier_service_estimated_delivery_dates_index(metadata: types.CourierServiceEstimatedDeliveryDatesIndexMetadataParam): Promise<FetchResponse<200, types.CourierServiceEstimatedDeliveryDatesIndexResponse200>>;
    /**
     * Retrieve a list of pickup slots in local time for the coming seven days.
     *
     * Required authorization scope: `public.pickup:read`
     *
     * @summary List Available Pickup Slots
     * @throws FetchError<400, types.CourierServicesPickupSlotsIndexResponse400> failed validations
     * @throws FetchError<404, types.CourierServicesPickupSlotsIndexResponse404> pickup not supported by courier service
     */
    courier_services_pickup_slots_index(metadata: types.CourierServicesPickupSlotsIndexMetadataParam): Promise<FetchResponse<200, types.CourierServicesPickupSlotsIndexResponse200>>;
    /**
     * Retrieve a list of active courier services available with your account.
     *
     * Required authorization scope: `public.courier_service:read`
     *
     * @summary List all Courier Services
     */
    courier_services_index(metadata?: types.CourierServicesIndexMetadataParam): Promise<FetchResponse<200, types.CourierServicesIndexResponse200>>;
    /**
     * Retrieve a list of courier services for selected courier.
     *
     * Required authorization scope: `public.courier_service:read`
     *
     * @summary List all Courier Services of a Courier
     */
    courier_courier_services_index(metadata: types.CourierCourierServicesIndexMetadataParam): Promise<FetchResponse<200, types.CourierCourierServicesIndexResponse200>>;
    /**
     * Retrieve a list of available LYOC.
     *
     * Required authorization scope: `public.courier:read`
     *
     * @summary List all LYOC
     * @throws FetchError<404, types.CourierLyocIndexResponse404> country not found
     */
    courier_lyoc_index(metadata?: types.CourierLyocIndexMetadataParam): Promise<FetchResponse<200, types.CourierLyocIndexResponse200>>;
    /**
     * Retrieve a list of active couriers.
     *
     * Required authorization scope: `public.courier:read`
     *
     * @summary List all Couriers
     */
    couriers_index(metadata?: types.CouriersIndexMetadataParam): Promise<FetchResponse<200, types.CouriersIndexResponse200>>;
    /**
     * Creates a new courier.
     * - `201` status when created successfully.
     * - `202` status when created but requiring additional verification.
     *
     * Required authorization scope: `public.courier:write`
     *
     * @summary Create a Courier
     * @throws FetchError<402, types.CouriersCreateResponse402> over limit
     * @throws FetchError<422, types.CouriersCreateResponse422> failed validations
     */
    couriers_create(body?: types.CouriersCreateBodyParam): Promise<FetchResponse<201, types.CouriersCreateResponse201> | FetchResponse<202, types.CouriersCreateResponse202>>;
    /**
     * Retrieve details of a couriers.
     *
     * Required authorization scope: `public.courier:read`
     *
     * @summary Get a Courier
     * @throws FetchError<404, types.CouriersShowResponse404> record not found
     */
    couriers_show(metadata: types.CouriersShowMetadataParam): Promise<FetchResponse<200, types.CouriersShowResponse200>>;
    /**
     * Updates a courier.
     *
     * Required authorization scope: `public.courier:write`
     *
     * @summary Update a Courier
     * @throws FetchError<403, types.CouriersUpdateResponse403> unauthorized
     * @throws FetchError<404, types.CouriersUpdateResponse404> record not found
     * @throws FetchError<422, types.CouriersUpdateResponse422> failed validations
     */
    couriers_update(body: types.CouriersUpdateBodyParam, metadata: types.CouriersUpdateMetadataParam): Promise<FetchResponse<200, types.CouriersUpdateResponse200>>;
    couriers_update(metadata: types.CouriersUpdateMetadataParam): Promise<FetchResponse<200, types.CouriersUpdateResponse200>>;
    /**
     * Delete a LYOC courier.
     *
     * Required authorization scope: `public.courier:write`
     *
     * @summary Delete a Courier
     * @throws FetchError<404, types.CouriersDeleteResponse404> record not found
     */
    couriers_delete(metadata: types.CouriersDeleteMetadataParam): Promise<FetchResponse<200, types.CouriersDeleteResponse200>>;
    /**
     * Retrieve a list of HS codes.
     *
     * Required authorization scope: `public.hs_code:read`
     *
     * **Rate limit**: This endpoint is rate-limited by 100 requests per second, 1,000 requests
     * per minute, 1,000 requests per hour, 1,000 requests per day, and 30,000 requests per
     * month.
     * Exceeding this limit returns a `429 Too Many Requests` response for subsequent requests.
     * If you need a higher rate limit, get in touch with us.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary List HS Codes
     */
    hs_code_index(metadata?: types.HsCodeIndexMetadataParam): Promise<FetchResponse<200, types.HsCodeIndexResponse200>>;
    /**
     * Retrieve a list of insurance policies.
     *
     * Required authorization scope: `public.insurance_policy:read`
     *
     * @summary List all Insurance Policies
     */
    insurances_policies_index(metadata?: types.InsurancesPoliciesIndexMetadataParam): Promise<FetchResponse<200, types.InsurancesPoliciesIndexResponse200>>;
    /**
     * Create insurance for a shipment whose label isn't provided by Easyship.
     * For the shipment whose label is provided by Easyship, please ues [Shipment Insurance
     * Endpoint](https://developers.easyship.com/reference/shipments_insure_create) to ensure
     * it.
     *
     * Easyship relies on the tracking number and courier service ID to validate the shipment.
     * Once the tracking record is successfully established, the insurance will be
     * automatically set up and charged.
     *
     * If the tracking record is initiated using the tracking endpoint `POST
     * /:version/trackings`, it becomes valid for insurance only after receiving a response
     * from the courier service, and within 24 hours of that time.
     *
     * Required authorization scope: `public.insurance_policy_3p:write`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * @summary Create an Insurance Policy
     * @throws FetchError<422, types.InsurancesPoliciesCreateResponse422> insufficient balance
     */
    insurances_policies_create(body: types.InsurancesPoliciesCreateBodyParam): Promise<FetchResponse<201, types.InsurancesPoliciesCreateResponse201> | FetchResponse<202, types.InsurancesPoliciesCreateResponse202>>;
    /**
     * Retrieve a list of item categories.
     *
     * Required authorization scope: `public.reference:read`
     *
     * @summary List all Item Categories
     */
    item_categories_index(metadata?: types.ItemCategoriesIndexMetadataParam): Promise<FetchResponse<200, types.ItemCategoriesIndexResponse200>>;
    /**
     * Retrieve Canada Post locations.
     *
     * This endpoint routes requests to the Canada Post `Get Nearest Post Office` API. For
     * further information, kindly look into the Canada Post API documentation available at
     * https://www.canadapost-postescanada.ca/info/mc/business/productsservices/developers/services/findpostoffice/nearestpostoffice.jsf
     *
     * Required authorization scope: `public.location:read`
     *
     * @summary List Canada Post Locations
     * @throws FetchError<422, types.LocationsCanadaPostIndexResponse422> location service not found for provided courier
     * @throws FetchError<500, types.LocationsCanadaPostIndexResponse500> forward request failed
     */
    locations_canada_post_index(metadata: types.LocationsCanadaPostIndexMetadataParam): Promise<FetchResponse<200, types.LocationsCanadaPostIndexResponse200>>;
    /**
     * Retrieve FedEx locations.
     *
     * This endpoint routes requests to the FedEx Location API. For further information, kindly
     * look into the FedEx API documentation available at
     * https://developer.fedex.com/api/en-kr/catalog/locations/v1/docs.html.
     *
     * Required authorization scope: `public.location:read`
     *
     * @summary List FedEx Locations
     * @throws FetchError<422, types.LocationsFedexIndexResponse422> invalid content
     */
    locations_Fedex_index(metadata: types.LocationsFedexIndexMetadataParam): Promise<FetchResponse<200, types.LocationsFedexIndexResponse200>>;
    /**
     * Retrieve UPS locations.
     *
     * This endpoint routes requests to the UPS locator API. For further information, kindly
     * look into the UPS API documentation available at
     * https://developer.ups.com/api/reference?loc=en_US#operation/Locator.
     *
     * Required authorization scope: `public.location:read`
     *
     * @summary List UPS Locations
     * @throws FetchError<422, types.LocationsUpsIndexResponse422> location service not found for provided courier
     * @throws FetchError<500, types.LocationsUpsIndexResponse500> forward request failed
     */
    locations_ups_index(metadata: types.LocationsUpsIndexMetadataParam): Promise<FetchResponse<200, types.LocationsUpsIndexResponse200>>;
    /**
     * Retrieve USPS locations.
     *
     * This endpoint routes requests to the USPS Locations API. For further information, kindly
     * look into the UPS API documentation available at
     * https://developers.usps.com/locationsv3.
     *
     * Required authorization scope: `public.location:read`
     *
     * @summary List USPS Locations
     * @throws FetchError<422, types.LocationsUspsIndexResponse422> location service not found for provided courier
     * @throws FetchError<500, types.LocationsUspsIndexResponse500> forward request failed
     */
    locations_usps_index(metadata: types.LocationsUspsIndexMetadataParam): Promise<FetchResponse<200, types.LocationsUspsIndexResponse200>>;
    /**
     * Retrieve a list of
     * [manifests](https://support.easyship.com/hc/en-us/articles/4414489808525-What-Is-a-Manifest-in-Shipping).
     *
     * Required authorization scope: `public.manifest:read`
     *
     * @summary List all Manifests
     */
    manifests_index(metadata?: types.ManifestsIndexMetadataParam): Promise<FetchResponse<200, types.ManifestsIndexResponse200>>;
    /**
     * Create a
     * [manifest](https://support.easyship.com/hc/en-us/articles/4414489808525-What-Is-a-Manifest-in-Shipping).
     *
     * Required authorization scope: `public.manifest:write`
     *
     * @summary Create a Manifest
     * @throws FetchError<404, types.ManifestsCreateResponse404> courier was not found
     * @throws FetchError<422, types.ManifestsCreateResponse422> invalid params
     */
    manifests_create(body: types.ManifestsCreateBodyParam): Promise<FetchResponse<201, types.ManifestsCreateResponse201>>;
    /**
     * Retrieve details of a specific manifest.
     *
     * Required authorization scope: `public.manifest:read`
     *
     * @summary Get a Manifest
     * @throws FetchError<404, types.ManifestsShowResponse404> manifest was not found
     */
    manifests_show(metadata: types.ManifestsShowMetadataParam): Promise<FetchResponse<200, types.ManifestsShowResponse200>>;
    /**
     * Easyship integrate with Stripe Setup Intent to collect credit card and bank account
     * information.
     * Ref: https://docs.stripe.com/payments/save-and-reuse-cards-only
     *
     * Here's a example of how you can process 3DS for card setup intent on the client side.
     * Once the validation is completed, you can use the `setup_intent.id` to finalize the
     * payment source in Easyship.
     *
     * <details>
     *   <summary>Confirm 3DS Example</summary>
     *
     *   ```html
     *     <html>
     *       <body>
     *         <form id="form">
     *           <label>
     *             <span>Intent Secret</span>
     *             <input id="secret" class="field" placeholder="" />
     *           </label>
     *           <div class="button-row">
     *             <button>Submit</button>
     *           </div>
     *         </form>
     *
     *         <script src="https://js.stripe.com/v3/"></script>
     *         <script>
     *           // Retrieve Easyship stripe publishable api key through `GET
     * /2024-01/account/stripe`
     *           var stripe = Stripe('Easyship_stripe_publishable_api_key');
     *
     *           // Handle form submission and trigger 3DS
     *           var form = document.getElementById('form');
     *           form.addEventListener('submit', function (event) {
     *             event.preventDefault();
     *
     *             var secret = document.getElementById('secret').value;
     *             console.log(secret)
     *
     *             stripe.confirmCardSetup(secret).then(function (result) {
     *               if (result.error) {
     *                 // error handling
     *               } else {
     *                 // You would receive the `setup intent id` with prefix `seti_`.
     *                 // `POST /2024-01/payment_sources/confirm` here to finalize the payment
     * source in Easyship
     *               }
     *             });
     *           });
     *         </script>
     *       </body>
     *     </html>
     *   ```
     *
     * </details>
     *
     * Should the setup intent not have undergone 3D Secure, you'll receive a status code 202,
     * indicating the need to process 3D Secure.
     *
     * If the setup intent is for us bank account. You'll receive a status code 202, indicating
     * the need to do micro deposit verification. The verification url will be provided in the
     * response and the verification code will be sent to the email address attached to the
     * bank account.
     *
     * Reference:
     * https://docs.stripe.com/payments/ach-debit/set-up-payment?platform=web&payment-ui=direct-api#optional:-send-custom-email-notifications
     *
     * Once the verification is completed, stripe webhook would mark your bank account payment
     * source activated.
     *
     * Required authorization scope: `public.payment_source:write`
     *
     * @summary Confirm Payment Source
     * @throws FetchError<422, types.PaymentSourcesConfrim3DsCreateResponse422> payment source already existed
     */
    payment_sources_confrim_3ds_create(body: types.PaymentSourcesConfrim3DsCreateBodyParam): Promise<FetchResponse<201, types.PaymentSourcesConfrim3DsCreateResponse201> | FetchResponse<202, types.PaymentSourcesConfrim3DsCreateResponse202>>;
    /**
     * Retrieve a list of payment sources.
     *
     * Required authorization scope: `public.payment_source:read`
     *
     * @summary List all Payment Sources
     */
    payment_sources_index(metadata?: types.PaymentSourcesIndexMetadataParam): Promise<FetchResponse<200, types.PaymentSourcesIndexResponse200>>;
    /**
     * Create a payment sources.
     *
     * Easyship won't hold the details of your credit card. We use `stripe token` to attach the
     * credit card to your easyship account on Stripe.
     * Please upload your credit card to stripe via Stripe Token JS.
     *
     * Example:
     * <details>
     *   <summary>Stripe Token JS Example</summary>
     *
     *   ```html
     *   <script src="https://js.stripe.com/v3/"></script>
     *   <script>
     *     // Retrieve Easyship stripe publishable api key through `GET
     * /2024-09/account/stripe`
     *     var stripe = Stripe('stripe_publishable_api_key');
     *
     *     // Create an instance of Elements.
     *     // https://stripe.com/docs/js/elements_object/create_element?type=card
     *     var elements = stripe.elements();
     *
     *     // Create a CardElement
     *     var card = elements.create('card')
     *
     *     // Create your token from the CardElement data
     *     // https://stripe.com/docs/js/tokens/create_token?type=cardElement
     *     stripe.createToken(card).then(function (result) {
     *       if (result.error) {
     *         // error handling
     *       } else {
     *         // You would receive the `stripe token` with prefix `tok_`.
     *         // `POST /2024-09/payment_sources` here to attach your card to Easyship
     *         var token = result.token;
     *       }
     *     });
     *   </script>
     *   ```
     *
     * </details>
     *
     * When the credit card needs 3DS (with response status code 202), proceed with the next
     * step found in `POST /2024-09/payment_sources/confirm`.
     *
     * If the payment source type is bank account, you'll receive a status code 202, indicating
     * the need to submit the bank account information.
     * Easyship won't hold the details of your bank account. We use `setup intent` to attach
     * the bank account to your easyship account on Stripe.
     *
     * Note: A bank account payment source is only available for US companies.
     *
     * Example:
     * <details>
     *   <summary>Stripe Bank Account JS Example</summary>
     *
     *   ```html
     *     <script>
     *       // Retrieve Easyship stripe publishable api key through `GET
     * /2024-09/account/stripe`
     *       const stripe = Stripe('stripe_publishable_api_key');
     *
     *       // Use the form that already exists on the web page.
     *       const paymentMethodForm = document.getElementById('payment-method-form');
     *
     *       paymentMethodForm.addEventListener('submit', (ev) => {
     *         ev.preventDefault();
     *         const accountHolderNameField = document.getElementById('account-holder-name');
     *         const emailField = document.getElementById('email-field');
     *
     *         // Retrieve the client secret from POST /2024-09/payment_sources.
     *         const clientSecretField = document.getElementById('client-secret-field');
     *
     *         // Calling this method will open the dialog to submit bank account information.
     *         stripe.collectBankAccountForSetup({
     *           clientSecret: clientSecretField.value,
     *           params: {
     *             payment_method_type: 'us_bank_account',
     *             payment_method_data: {
     *               billing_details: {
     *                 name: accountHolderNameField.value,
     *                 email: emailField.value,
     *               },
     *             },
     *           }
     *         })
     *         .then(({setupIntent, error}) => {
     *           if (error) {
     *             console.error(error.message);
     *           } else {
     *             // POST /2024-09/payment_sources/confirm to finalize the bank account
     * payment source at Easyship
     *           }
     *         });
     *       });
     *     </script>
     *   ```
     *
     * </details>
     *
     * Once the bank account information has been submitted successfully, proceed with the next
     * step found in `POST /2024-09/payment_sources/confirm`.
     *
     *
     * Required authorization scope: `public.payment_source:write`
     *
     * @summary Create a Payment Source
     * @throws FetchError<422, types.PaymentSourcesCreateResponse422> credit card has expired
     */
    payment_sources_create(body?: types.PaymentSourcesCreateBodyParam): Promise<FetchResponse<201, types.PaymentSourcesCreateResponse201> | FetchResponse<202, types.PaymentSourcesCreateResponse202>>;
    /**
     * Update a card payment source.
     *
     * Required authorization scope: `public.payment_source:write`
     *
     * @summary Update a Payment Source
     * @throws FetchError<404, types.PaymentSourcesUpdateResponse404> No record found
     */
    payment_sources_update(body: types.PaymentSourcesUpdateBodyParam, metadata: types.PaymentSourcesUpdateMetadataParam): Promise<FetchResponse<200, types.PaymentSourcesUpdateResponse200>>;
    /**
     * Delete a card Payment Source
     *
     * Required authorization scope: `public.payment_source:write`
     *
     * @summary Delete a Payment Source
     * @throws FetchError<422, types.PaymentSourcesDeleteResponse422> Unable to delete last credit card
     */
    payment_sources_delete(metadata: types.PaymentSourcesDeleteMetadataParam): Promise<FetchResponse<200, types.PaymentSourcesDeleteResponse200>>;
    /**
     * Cancel a pickup.
     *
     * Required authorization scope: `public.pickup:write`
     *
     * @summary Cancel a Pickup
     * @throws FetchError<404, types.PickupsCancelResponse404> pickup not found
     * @throws FetchError<422, types.PickupsCancelResponse422> failed validations
     */
    pickups_cancel(metadata: types.PickupsCancelMetadataParam): Promise<FetchResponse<200, types.PickupsCancelResponse200>>;
    /**
     * Retrieve a list of pickups.
     *
     * Required authorization scope: `public.pickup:read`
     *
     * @summary List all Pickups
     */
    pickups_index(metadata?: types.PickupsIndexMetadataParam): Promise<FetchResponse<200, types.PickupsIndexResponse200>>;
    /**
     * Schedule a pickup.
     *
     * Required authorization scope: `public.pickup:write`
     *
     * > Only available if your courier provides pickup options.
     *
     * ## Select a pickup time
     *
     * After retrieving a courier's pickup slots, you can specify a pickup time in
     * `time_slot_id` or in `selected_from_time` and `selected_to_time`.
     *
     * @summary Create a Pickup
     * @throws FetchError<422, types.PickupsCreateResponse422> slots not found for provided courier
     */
    pickups_create(body: types.PickupsCreateBodyParam): Promise<FetchResponse<201, types.PickupsCreateResponse201>>;
    /**
     * Retrieve details of a specific pickup.
     *
     * Required authorization scope: `public.pickup:write`
     *
     * @summary Get a Pickup
     * @throws FetchError<404, types.PickupsShowResponse404> record not found
     */
    pickups_show(metadata: types.PickupsShowMetadataParam): Promise<FetchResponse<200, types.PickupsShowResponse200>>;
    /**
     * Retrieve a list of products available with your account.
     *
     * Required authorization scope: `public.product:read`
     *
     * @summary List all Products
     */
    products_index(metadata?: types.ProductsIndexMetadataParam): Promise<FetchResponse<200, types.ProductsIndexResponse200>>;
    /**
     * Create a single product in your account.
     *
     * Required authorization scope: `public.product:write`
     *
     * @summary Create a Product
     * @throws FetchError<422, types.ProductsCreateResponse422> failed validations
     */
    products_create(body?: types.ProductsCreateBodyParam): Promise<FetchResponse<201, types.ProductsCreateResponse201>>;
    /**
     * Delete a single product from your account.
     *
     * Required authorization scope: `public.product:write`
     *
     * @summary Delete a Product
     * @throws FetchError<404, types.ProductsDeleteResponse404> record not found
     */
    products_delete(metadata: types.ProductsDeleteMetadataParam): Promise<FetchResponse<200, types.ProductsDeleteResponse200>>;
    /**
     * Update a single product in your account.
     *
     * Required authorization scope: `public.product:write`
     *
     * @summary Update a Product
     * @throws FetchError<404, types.ProductsUpdateResponse404> record not found
     * @throws FetchError<422, types.ProductsUpdateResponse422> failed validations
     */
    products_update(body: types.ProductsUpdateBodyParam, metadata: types.ProductsUpdateMetadataParam): Promise<FetchResponse<200, types.ProductsUpdateResponse200>>;
    products_update(metadata: types.ProductsUpdateMetadataParam): Promise<FetchResponse<200, types.ProductsUpdateResponse200>>;
    /**
     * Request a list of shipping quotes for a prospective shipment.
     *
     * Required authorization scope: `public.rate:read`
     *
     * > Compare couriers to see the cheapest, fastest and best value for money, or a
     * combination of speed, price and reliability.
     *
     * ## Input city and state
     *
     * If you are shipping to or within the United States, Canada, Mexico or Australia, we
     * recommend that you always input the origin and destination `city` and `state`. This
     * information is required by certain couriers to return accurate rates.
     *
     * ## Calculate dimensions and total weight
     *
     * You can calculate dimensions and total weight of your shipment in three ways:
     *
     * * Provide `total_actual_weight` and `box` objects for the shipment.
     * * Specify `actual_weight` and `dimensions` for each item of the `items` object: in this
     * case, total weight and box size will be calculated automatically.
     * * Specify `sku` for each item of the `items` object: in this case, actual weight and
     * dimensions for calculations will be taken as set for the product.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Request Rates
     * @throws FetchError<402, types.RatesRequestResponse402> insufficient subscription tier for a specific feature
     * @throws FetchError<422, types.RatesRequestResponse422> failed validations
     */
    rates_request(body: types.RatesRequestBodyParam): Promise<FetchResponse<200, types.RatesRequestResponse200>>;
    /**
     * Update a tracking (Sandbox only)
     *
     * This endpoint is intended for testing tracking status updates and is exclusively
     * available in the Sandbox environment.
     *
     * Required authorization scope: `public.track_3p:write`
     *
     * @summary Update a tracking
     * @throws FetchError<422, types.SandboxTrackingsUpdateResponse422> failed to update tracking
     */
    sandbox_trackings_update(body: types.SandboxTrackingsUpdateBodyParam, metadata: types.SandboxTrackingsUpdateMetadataParam): Promise<FetchResponse<200, types.SandboxTrackingsUpdateResponse200>>;
    sandbox_trackings_update(metadata: types.SandboxTrackingsUpdateMetadataParam): Promise<FetchResponse<200, types.SandboxTrackingsUpdateResponse200>>;
    /**
     * Cancel a shipment that has been shipped.
     *
     * Required authorization scope: `public.shipment:write`
     *
     * > You can cancel your shipment after it has been shipped only if its label failed to be
     * generated or if the label is already generated, but the shipment is not yet in transit.
     *
     * @summary Cancel a Shipment
     * @throws FetchError<404, types.ShipmentsCancelResponse404> record not found
     * @throws FetchError<422, types.ShipmentsCancelResponse422> failed validations
     */
    shipments_cancel(metadata: types.ShipmentsCancelMetadataParam): Promise<FetchResponse<200, types.ShipmentsCancelResponse200>>;
    /**
     * Retrieve shipping documents of specific shipment.
     *
     * Required authorization scope: `public.shipment_document:read`
     *
     * @summary List All Documents
     * @throws FetchError<400, types.ShipmentsDocumentsIndexResponse400> shipment has been cancelled
     * @throws FetchError<404, types.ShipmentsDocumentsIndexResponse404> record not found
     * @throws FetchError<422, types.ShipmentsDocumentsIndexResponse422> invalid document type
     */
    shipments_documents_index(metadata: types.ShipmentsDocumentsIndexMetadataParam): Promise<FetchResponse<200, types.ShipmentsDocumentsIndexResponse200>>;
    /**
     * Buy insurance for a shipment with a generated label.
     *
     * If the shipment label hasn't been generated yet, you can update the insurance settings
     * through the [shipment API](https://developers.easyship.com/reference/shipments_update).
     * The insurance will be applied once the label has been created.
     *
     * [Insurance Terms &
     * Conditions](https://www.easyship.com/legal/insurance-terms-and-conditions)
     *
     * Required authorization scope: `public.insurance_policy:write`
     *
     * > You can purchase insurance for a paid shipment only after its label has been
     * successfully generated, and within 24 hours of that generation time.
     *
     * > This API is available upon request. Get in touch with your account manager or Easyship
     * Support Team.
     *
     * @summary Buy Insurance for a Shipment
     * @throws FetchError<404, types.ShipmentsInsureCreateResponse404> record not found
     * @throws FetchError<422, types.ShipmentsInsureCreateResponse422> failed validations
     */
    shipments_insure_create(metadata: types.ShipmentsInsureCreateMetadataParam): Promise<FetchResponse<201, types.ShipmentsInsureCreateResponse201>>;
    /**
     * Create a new return shipment from an existing shipment.
     *
     * Required authorization scope: `public.shipment:write`
     *
     * @summary Create a Return Shipment
     * @throws FetchError<404, types.ReturnShipmentsCreateResponse404> resource not found
     */
    return_shipments_create(body: types.ReturnShipmentsCreateBodyParam, metadata: types.ReturnShipmentsCreateMetadataParam): Promise<FetchResponse<201, types.ReturnShipmentsCreateResponse201>>;
    return_shipments_create(metadata: types.ReturnShipmentsCreateMetadataParam): Promise<FetchResponse<201, types.ReturnShipmentsCreateResponse201>>;
    /**
     * Update the shipment tracking number and create tracking events.
     *
     * Required authorization scopes: `public.shipment:write`, `public.efulfillment:write`
     *
     * > This endpoint is only available to eFulfillment clients with shipments fulfilled at
     * one of Easyship's integrated warehouses.
     *
     * > You will need to specify `tracking_number` for initial request for a shipment. Further
     * updates of a shipment with the same `easyship_shipment_id` don't need to have the
     * `tracking number` unless you change it.
     *
     * For `events`, specify the `primary_status` field from the list:
     * * `InTransit`
     * * `OutForDelivery`
     * * `AttemptFail`
     * * `Delivered`
     * * `Exception`
     *
     * #### Example request for an initial setup of a shipment
     *
     * ```json
     * {
     *   "easyship_shipment_id": "ESHK10017799",
     *   "tracking_number": "ABCD1234",
     *   "events": [
     *     {
     *       "primary_status": "InTransit"
     *     }
     *   ]
     * }
     * ```
     *
     * #### Example request for a shipment status update
     *
     * This example has optional `event_time` and `event_time_zone`.
     *
     * ```json
     * {
     *   "easyship_shipment_id": "ESHK10017799",
     *   "events": [
     *     {
     *       "primary_status": "OutForDelivery",
     *       "event_time": "2020-04-29T03:38:00",
     *       "event_time_zone": "-04:00"
     *     }
     *   ]
     * }
     * ```
     *
     * #### Example request for a complete update
     *
     * ```json
     * {
     *   "easyship_shipment_id": "ESHK10017799",
     *   "events": [
     *     {
     *       "primary_status": "OutForDelivery",
     *       "location": "Brooklyn, NY",
     *       "city": "Brooklyn",
     *       "country_alpha2": "US",
     *       "state": "NY",
     *       "zip": "11201",
     *       "handler": "UPS",
     *       "message": "On UPS vehicle for delivery",
     *       "event_time": "2020-04-29T03:38:00",
     *       "event_time_zone": "-04:00"
     *     }
     *   ]
     * }
     * ```
     *
     * @summary Tracking Updates
     * @throws FetchError<404, types.EfulfillmentTrackingUpdateResponse404> shipment not found
     * @throws FetchError<422, types.EfulfillmentTrackingUpdateResponse422> failed validations
     */
    efulfillment_tracking_update(body: types.EfulfillmentTrackingUpdateBodyParam): Promise<FetchResponse<201, types.EfulfillmentTrackingUpdateResponse201>>;
    /**
     * Retrieve the most recent status for a shipment and a history of all previous
     * checkpoints.
     *
     * Required authorization scope: `public.track:read`
     *
     * @summary List all Trackings
     */
    shipments_trackings_index(metadata?: types.ShipmentsTrackingsIndexMetadataParam): Promise<FetchResponse<200, types.ShipmentsTrackingsIndexResponse200>>;
    /**
     * List transaction records for a shipment.
     *
     * Required authorization scope: `public.transaction_record:read`
     *
     * @summary List Transaction Records for a Shipment
     * @throws FetchError<404, types.ShipmentsTransactionRecordsIndexResponse404> shipment not found
     */
    shipments_transaction_records_index(metadata: types.ShipmentsTransactionRecordsIndexMetadataParam): Promise<FetchResponse<200, types.ShipmentsTransactionRecordsIndexResponse200>>;
    /**
     * List unavailable couriers for a shipment.
     *
     * Required authorization scopes: `public.shipment:read`, `public.rate:read`
     *
     * @summary List Unavailable Couriers for a Shipment
     * @throws FetchError<404, types.ShipmentUnavailableCouriersIndexResponse404> shipment not found
     */
    shipment_unavailable_couriers_index(metadata: types.ShipmentUnavailableCouriersIndexMetadataParam): Promise<FetchResponse<200, types.ShipmentUnavailableCouriersIndexResponse200>>;
    /**
     * Update the warehouse state of one or multiple shipments.
     *
     * Required authorization scope: `public.shipment:write`, `public.efulfillment:write`
     *
     * > This endpoint is only available to eFulfillment clients with shipments fulfilled at
     * one of Easyship's integrated warehouses.
     *
     * > If a shipment contains the `metadata` object, it will persist unless you change
     * existing keys or create new ones: in this case, corresponding keys will be updated or
     * added.
     *
     * The `warehouse_state` field has the following possible statuses:
     * <table>
     *   <tr>
     *     <th>warehouse_state</th>
     *     <th>Description</th>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>created</code>
     *     </td>
     *     <td>
     *       An order has been created in the warehouse management system and is ready to be
     * fulfilled.<br><br><i>Note:</i> This update is not needed if a success response is sent
     * when Easyship sends the label callback.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>failed</code>
     *     </td>
     *     <td>
     *       The order creation was rejected for an internal reason by the WMS. This can happen
     * if the order information doesn't meet the WMS' requirements, or a product SKU is not
     * defined in your WMS.<br><br>A message can be added using the message parameter. This
     * will allow the client and Easyship to understand the reason for rejection.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>packed</code>
     *     </td>
     *     <td>
     *       The order has been processed and packed and is waiting to be handed over to the
     * courier
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>shipped</code>
     *     </td>
     *     <td>
     *       The order has been handed over to the courier and has left the
     * warehouse.<br><br><i>Note:</i> This status update will trigger the following:
     *       <ul>
     *         <li>If the shipment was created through a store integration, Easyship will mark
     * the order as "shipped" on the store</li>
     *         <li>If the company has the email notification option turned on, Easyship will
     * send an email notification to the receiver, with the tracking number and the tracking
     * page URL</li>
     *         <li>Easyship will start tracking the shipment, and update its status based on
     * the courier's tracking events</li>
     *       </ul>
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>cancellation_requested</code>
     *     </td>
     *     <td>
     *       A cancellation request has been sent to the warehouse management system. It is
     * awaiting confirmation by the warehouse.<br><br><i>Note:</i> This status is set by
     * clients requesting a cancellation through the dashboard. It should not be set by a
     * warehouse.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>cancelled</code>
     *     </td>
     *     <td>
     *       The order has been cancelled in the warehouse management
     * system.<br><br><i>Note:</i> This status update will trigger Easyship to cancel the
     * shipment.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>cancelled_no_stock</code>
     *     </td>
     *     <td>
     *      The order has been cancelled in the warehouse management system because the
     * products are out of stock.<br><br><i>Note:</i> This status update will trigger Easyship
     * to cancel the shipment.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>backorder_no_stock</code>
     *     </td>
     *     <td>
     *       The order is set as backorder because of the products are out of stock. It may be
     * packed and shipped at a later date.
     *     </td>
     *   </tr>
     *   <tr>
     *     <td>
     *       <code>returned</code>
     *     </td>
     *     <td>
     *       The package was returned by the courier or by the receiver, and received at the
     * warehouse.
     *     </td>
     *   </tr>
     * </table>
     *
     * @summary Warehouse State Updates
     * @throws FetchError<422, types.EfulfillmentWarehouseStateUpdateResponse422> failure
     */
    efulfillment_warehouse_state_update(body?: types.EfulfillmentWarehouseStateUpdateBodyParam): Promise<FetchResponse<200, types.EfulfillmentWarehouseStateUpdateResponse200> | FetchResponse<202, types.EfulfillmentWarehouseStateUpdateResponse202>>;
    /**
     * Retrieve a list of shipments.
     *
     * Required authorization scope: `public.shipment:read`
     *
     * @summary List all Shipments
     * @throws FetchError<422, types.ShipmentsIndexResponse422> invalid filter param
     */
    shipments_index(metadata?: types.ShipmentsIndexMetadataParam): Promise<FetchResponse<200, types.ShipmentsIndexResponse200>>;
    /**
     * Create a new shipment.
     *
     * Required authorization scope: `public.shipment:write` and `public.label:write` if a
     * label is requested during the request.
     *
     * ## Select a courier
     *
     * If you use our Rates API, you can define a courier ID to assign a courier to the
     * shipment using `courier_service_id`. If you skip courier ID, we will return a list of
     * all possible rates to your new shipment and assign the best value for money courier.
     *
     * ## Calculate dimensions and total weight
     *
     * You can calculate dimensions and total weight of your shipment in three ways:
     *
     * * Provide `total_actual_weight` and `box` objects for the shipment.
     * * Specify `actual_weight` and `dimensions` for each item of the `items` object: in this
     * case, total weight and box size will be calculated automatically.
     * * Specify `sku` for each item of the `items` object: in this case, actual weight and
     * dimensions for calculations will be taken as set for the product.
     *
     * @summary Create a Shipment
     * @throws FetchError<402, types.ShipmentsCreateResponse402> insufficient subscription tier for a specific feature
     * @throws FetchError<422, types.ShipmentsCreateResponse422> failed validations
     */
    shipments_create(body: types.ShipmentsCreateBodyParam): Promise<FetchResponse<201, types.ShipmentsCreateResponse201> | FetchResponse<202, types.ShipmentsCreateResponse202>>;
    /**
     * Retrieve details of a specific shipment.
     *
     * Required authorization scope: `public.shipment:read`
     *
     * > All shipment documents are customisable. You can set:
     * >
     * > - Document format: URL, PDF or PNG
     * > - Label page size: A4, A5 or 4x6
     * > - Commercial invoice page size: A4 or 4x6
     * > - Packing slip page size: A4 or 4x6
     *
     * @summary Get a Shipment
     * @throws FetchError<404, types.ShipmentsShowResponse404> record not found
     */
    shipments_show(metadata: types.ShipmentsShowMetadataParam): Promise<FetchResponse<200, types.ShipmentsShowResponse200>>;
    /**
     * Update shipment details.
     *
     * Required authorization scope: `public.shipment:write` and `public.label:write` if a
     * label is requested during the request.
     *
     * @summary Update a Shipment
     * @throws FetchError<402, types.ShipmentsUpdateResponse402> insufficient subscription tier for a specific feature
     * @throws FetchError<422, types.ShipmentsUpdateResponse422> failed validations
     */
    shipments_update(body: types.ShipmentsUpdateBodyParam, metadata: types.ShipmentsUpdateMetadataParam): Promise<FetchResponse<200, types.ShipmentsUpdateResponse200>>;
    shipments_update(metadata: types.ShipmentsUpdateMetadataParam): Promise<FetchResponse<200, types.ShipmentsUpdateResponse200>>;
    /**
     * Delete a shipment that has not yet been shipped.
     *
     * Required authorization scope: `public.shipment:write`
     *
     * @summary Delete a Shipment
     * @throws FetchError<404, types.ShipmentsDeleteResponse404> shipment has been shipped
     */
    shipments_delete(metadata: types.ShipmentsDeleteMetadataParam): Promise<FetchResponse<200, types.ShipmentsDeleteResponse200>>;
    /**
     * Retrieve a list of pickup's shipments.
     *
     * Required authorization scope: `public.shipment:read`
     *
     * @summary List All Shipments of Specific Pickup
     */
    pickups_shipments_index(metadata: types.PickupsShipmentsIndexMetadataParam): Promise<FetchResponse<200, types.PickupsShipmentsIndexResponse200>>;
    /**
     * Create action for a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Create Action for a Shipping Rule
     * @throws FetchError<422, types.ShippingRuleActionCreateResponse422> invalid content
     */
    shipping_rule_action_create(body: types.ShippingRuleActionCreateBodyParam, metadata: types.ShippingRuleActionCreateMetadataParam): Promise<FetchResponse<201, types.ShippingRuleActionCreateResponse201>>;
    shipping_rule_action_create(metadata: types.ShippingRuleActionCreateMetadataParam): Promise<FetchResponse<201, types.ShippingRuleActionCreateResponse201>>;
    /**
     * List actions for a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:read`
     *
     * @summary List all Actions for a Shipping Rule
     */
    shipping_rule_action_index(metadata: types.ShippingRuleActionIndexMetadataParam): Promise<FetchResponse<200, types.ShippingRuleActionIndexResponse200>>;
    /**
     * Update shipping rule action.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Update Action of a Shipping Rule
     * @throws FetchError<403, types.ShippingRuleActionUpdateResponse403> unauthorized
     * @throws FetchError<404, types.ShippingRuleActionUpdateResponse404> record not found
     * @throws FetchError<422, types.ShippingRuleActionUpdateResponse422> invalid content
     */
    shipping_rule_action_update(body: types.ShippingRuleActionUpdateBodyParam, metadata: types.ShippingRuleActionUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleActionUpdateResponse200>>;
    shipping_rule_action_update(metadata: types.ShippingRuleActionUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleActionUpdateResponse200>>;
    /**
     * Delete shipping rule action.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Delete Action of a Shipping Rule
     * @throws FetchError<403, types.ShippingRuleActionDeleteResponse403> unauthorized
     * @throws FetchError<404, types.ShippingRuleActionDeleteResponse404> record not found
     */
    shipping_rule_action_delete(metadata: types.ShippingRuleActionDeleteMetadataParam): Promise<FetchResponse<200, types.ShippingRuleActionDeleteResponse200>>;
    /**
     * Activate specific shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Activate a Shipping Rule
     * @throws FetchError<403, types.ShippingRuleActivateResponse403> unauthorized
     * @throws FetchError<404, types.ShippingRuleActivateResponse404> record not found
     */
    shipping_rule_activate(metadata: types.ShippingRuleActivateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleActivateResponse200>>;
    /**
     * Create condition for a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Create Condition for a Shipping Rule
     * @throws FetchError<422, types.ShippingRuleConditionCreateResponse422> invalid content
     */
    shipping_rule_condition_create(body: types.ShippingRuleConditionCreateBodyParam, metadata: types.ShippingRuleConditionCreateMetadataParam): Promise<FetchResponse<201, types.ShippingRuleConditionCreateResponse201>>;
    shipping_rule_condition_create(metadata: types.ShippingRuleConditionCreateMetadataParam): Promise<FetchResponse<201, types.ShippingRuleConditionCreateResponse201>>;
    /**
     * List conditions of a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:read`
     *
     * @summary List all Conditions for a Shipping Rule
     */
    shipping_rule_condition_index(metadata: types.ShippingRuleConditionIndexMetadataParam): Promise<FetchResponse<200, types.ShippingRuleConditionIndexResponse200>>;
    /**
     * Update shipping rule condition.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Update Condition of the Shipping Rule
     * @throws FetchError<403, types.ShippingRuleConditionUpdateResponse403> unauthorized
     * @throws FetchError<404, types.ShippingRuleConditionUpdateResponse404> record not found
     * @throws FetchError<422, types.ShippingRuleConditionUpdateResponse422> invalid content
     */
    shipping_rule_condition_update(body: types.ShippingRuleConditionUpdateBodyParam, metadata: types.ShippingRuleConditionUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleConditionUpdateResponse200>>;
    shipping_rule_condition_update(metadata: types.ShippingRuleConditionUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleConditionUpdateResponse200>>;
    /**
     * Delete shipping rule condition.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Delete Condition of a Shipping Rule
     * @throws FetchError<403, types.ShippingRuleConditionDeleteResponse403> unauthorized
     */
    shipping_rule_condition_delete(metadata: types.ShippingRuleConditionDeleteMetadataParam): Promise<FetchResponse<200, types.ShippingRuleConditionDeleteResponse200>>;
    /**
     * Deactivate specific shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Deactivate a Shipping Rule
     * @throws FetchError<403, types.ShippingRuleDeactivateResponse403> unauthorized
     */
    shipping_rule_deactivate(metadata: types.ShippingRuleDeactivateMetadataParam): Promise<FetchResponse<200, types.ShippingRuleDeactivateResponse200>>;
    /**
     * Retrieve a list of available platform names for shipping rules.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary List all Platform Names
     */
    shipping_rule_platforms_index(metadata?: types.ShippingRulePlatformsIndexMetadataParam): Promise<FetchResponse<200, types.ShippingRulePlatformsIndexResponse200>>;
    /**
     * Retrieve a list of shipping rules.
     *
     * Required authorization scope: `public.shipping_rule:read`
     *
     * @summary List all Shipping Rules
     */
    shipping_rules_index(): Promise<FetchResponse<200, types.ShippingRulesIndexResponse200>>;
    /**
     * Create a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Create a Shipping Rule
     * @throws FetchError<422, types.ShippingRulesCreateResponse422> invalid content
     */
    shipping_rules_create(body: types.ShippingRulesCreateBodyParam): Promise<FetchResponse<201, types.ShippingRulesCreateResponse201>>;
    /**
     * Retrieve a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:read`
     *
     * @summary Get a Shipping Rule
     * @throws FetchError<403, types.ShippingRulesShowResponse403> unauthorized
     * @throws FetchError<404, types.ShippingRulesShowResponse404> record not found
     */
    shipping_rules_show(metadata: types.ShippingRulesShowMetadataParam): Promise<FetchResponse<200, types.ShippingRulesShowResponse200>>;
    /**
     * Update a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Update a Shipping Rule
     * @throws FetchError<403, types.ShippingRulesUpdateResponse403> unauthorized
     */
    shipping_rules_update(body: types.ShippingRulesUpdateBodyParam, metadata: types.ShippingRulesUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRulesUpdateResponse200>>;
    shipping_rules_update(metadata: types.ShippingRulesUpdateMetadataParam): Promise<FetchResponse<200, types.ShippingRulesUpdateResponse200>>;
    /**
     * Delete a shipping rule.
     *
     * Required authorization scope: `public.shipping_rule:write`
     *
     * @summary Delete a Shipping Rule
     * @throws FetchError<403, types.ShippingRulesDeleteResponse403> unauthorized
     */
    shipping_rules_delete(metadata: types.ShippingRulesDeleteMetadataParam): Promise<FetchResponse<200, types.ShippingRulesDeleteResponse200>>;
    /**
     * Retrieve a list of states.
     *
     * Required authorization scope: `public.reference:read`
     *
     * This endpoint in only used for the United States, Canada, Australia and Mexico.
     *
     * @summary List all States
     */
    states_index(metadata?: types.StatesIndexMetadataParam): Promise<FetchResponse<200, types.StatesIndexResponse200>>;
    /**
     * Retrieve a list of stores available with your account.
     *
     * Required authorization scope: `public.store:read`
     *
     * @summary List all Stores
     */
    stores_index(metadata?: types.StoresIndexMetadataParam): Promise<FetchResponse<200, types.StoresIndexResponse200>>;
    /**
     * Retrieve a list of tags.
     *
     * Required authorization scope: `public.tag:read`
     *
     * > You can filter your tags by keywords.
     *
     * @summary List all Tags
     */
    tags_index(metadata?: types.TagsIndexMetadataParam): Promise<FetchResponse<200, types.TagsIndexResponse200>>;
    /**
     * Create a new tag.
     *
     * Required authorization scope: `public.tag:write`
     *
     * @summary Create a Tag
     * @throws FetchError<422, types.TagsCreateResponse422> invalid content
     */
    tags_create(body: types.TagsCreateBodyParam, metadata?: types.TagsCreateMetadataParam): Promise<FetchResponse<201, types.TagsCreateResponse201>>;
    /**
     * Retrieve tax and duty costs information.
     *
     * Use either of the two schemas `WITH COUNTRY IDS` OR `WITH COUNTRY ALPHA2` to provide
     * country specific details.
     *
     * Required authorization scope: `public.tax_and_duty:read`
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Calculate Tax and Duty
     * @throws FetchError<402, types.TaxesAndDutiesCalculateResponse402> when insufficient subscription tier for specific feature
     * @throws FetchError<422, types.TaxesAndDutiesCalculateResponse422> could not calculate tax and duty
     */
    taxes_and_duties_calculate(body?: types.TaxesAndDutiesCalculateBodyParam): Promise<FetchResponse<200, types.TaxesAndDutiesCalculateResponse200>>;
    /**
     * List courier services that do not support label generation but are trackable.
     *
     * Required authorization scope: `public.track_3p:read`
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary List of Supported Couriers
     */
    trackings_external_courier_services_index(metadata?: types.TrackingsExternalCourierServicesIndexMetadataParam): Promise<FetchResponse<200, types.TrackingsExternalCourierServicesIndexResponse200>>;
    /**
     * List supported couriers.
     *
     * Required authorization scope: `public.track_3p:read`
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary List of Supported Couriers
     */
    trackings_list_supported_couriers(metadata?: types.TrackingsListSupportedCouriersMetadataParam): Promise<FetchResponse<200, types.TrackingsListSupportedCouriersResponse200>>;
    /**
     * Retrieve a list of trackings available with your account.
     *
     * Required authorization scope: `public.track_3p:read`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary List all Trackings
     */
    trackings_index(metadata?: types.TrackingsIndexMetadataParam): Promise<FetchResponse<200, types.TrackingsIndexResponse200>>;
    /**
     * Create a single tracking in your account.
     *
     * Required authorization scope: `public.track_3p:write`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Create a Tracking
     * @throws FetchError<422, types.TrackingsCreateResponse422> failed validations
     */
    trackings_create(body: types.TrackingsCreateBodyParam): Promise<FetchResponse<201, types.TrackingsCreateResponse201>>;
    /**
     * Delete a single tracking from your account.
     *
     * Required authorization scope: `public.track_3p:write`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Delete a Tracking
     * @throws FetchError<404, types.TrackingsDeleteResponse404> record not found
     */
    trackings_delete(metadata: types.TrackingsDeleteMetadataParam): Promise<FetchResponse<200, types.TrackingsDeleteResponse200>>;
    /**
     * Show a single tracking in your account.
     *
     * Required authorization scope: `public.track_3p:read`
     *
     * > This API requires an updated contract with Easyship. Get in touch with your account
     * manager or Easyship Support Team.
     *
     * > **Note:** Calls to this endpoint count towards your API usage allowance. You can
     * monitor your current usage in the [Subscription
     * section](https://app.easyship.com/account/subscription) of your account.
     *
     * @summary Get a Tracking
     * @throws FetchError<404, types.TrackingsShowResponse404> record not found
     */
    trackings_show(metadata: types.TrackingsShowMetadataParam): Promise<FetchResponse<200, types.TrackingsShowResponse200>>;
    /**
     * Retrieve a list of all transactions within range.
     * Pagination of this endpoint is not indexed.
     * `count` on the response body will always be `null`.
     *
     * Required authorization scope: `public.transaction_record:read`
     *
     * @summary List all Transaction Records
     * @throws FetchError<422, types.TransactionsIndexResponse422> failed validations
     */
    transactions_index(metadata?: types.TransactionsIndexMetadataParam): Promise<FetchResponse<200, types.TransactionsIndexResponse200>>;
    /**
     * Retrieve a list of all billing document's transactions.
     * Pagination of this endpoint is not indexed.
     * `count` on the response body will always be `null`.
     *
     * Required authorization scope: `public.transaction_record:read`
     *
     * @summary List all Billing Document's Transaction Records
     */
    billing_documents_transactions_index(metadata: types.BillingDocumentsTransactionsIndexMetadataParam): Promise<FetchResponse<200, types.BillingDocumentsTransactionsIndexResponse200>>;
    /**
     * Activates a single webhook for your account.
     *
     * Required authorization scope: `public.Webhook`
     *
     * @summary Activate a Webhook
     * @throws FetchError<400, types.WebhooksActivateResponse400> failed to activate webhook
     */
    webhooks_activate(metadata: types.WebhooksActivateMetadataParam): Promise<FetchResponse<200, types.WebhooksActivateResponse200>>;
    /**
     * Deactivates a single webhook for your account.
     *
     * Required authorization scope: `public.Webhook`
     *
     * @summary Deactivate a Webhook
     * @throws FetchError<400, types.WebhooksDeactivateResponse400> failed to deactivate webhook
     */
    webhooks_deactivate(metadata: types.WebhooksDeactivateMetadataParam): Promise<FetchResponse<200, types.WebhooksDeactivateResponse200>>;
    /**
     * Test a single webhook in your account.
     *
     * Required authorization scope: `public.Webhook`
     *
     * @summary Test a Webhook
     * @throws FetchError<400, types.WebhooksTestResponse400> failed to test webhook
     * @throws FetchError<422, types.WebhooksTestResponse422> event_type is invalid
     * @throws FetchError<429, types.WebhooksTestResponse429> too many requests
     */
    webhooks_test(body: types.WebhooksTestBodyParam, metadata: types.WebhooksTestMetadataParam): Promise<FetchResponse<200, types.WebhooksTestResponse200>>;
    webhooks_test(metadata: types.WebhooksTestMetadataParam): Promise<FetchResponse<200, types.WebhooksTestResponse200>>;
    /**
     * Retrieve a list of webhooks available within your account.
     *
     * Required authorization scope: `public.webhook:read`
     *
     * @summary List all Webhooks
     */
    webhooks_index(metadata?: types.WebhooksIndexMetadataParam): Promise<FetchResponse<200, types.WebhooksIndexResponse200>>;
    /**
     * Create a single webhook in your account.
     *
     * Required authorization scope: `public.webhook:write`
     *
     * @summary Create a Webhook
     * @throws FetchError<422, types.WebhooksCreateResponse422> failed version validation
     */
    webhooks_create(body?: types.WebhooksCreateBodyParam): Promise<FetchResponse<201, types.WebhooksCreateResponse201>>;
    /**
     * Show a single webhook in your account.
     *
     * Required authorization scope: `public.webhook:read`
     *
     * @summary Get a Webhook
     */
    webhooks_show(metadata: types.WebhooksShowMetadataParam): Promise<FetchResponse<200, types.WebhooksShowResponse200>>;
    /**
     * Delete a single webhook from your account.
     *
     * Required authorization scope: `public.webhook:write`
     *
     * @summary Delete a Webhook
     * @throws FetchError<400, types.WebhooksDeleteResponse400> failed to destroy webhook
     */
    webhooks_delete(metadata: types.WebhooksDeleteMetadataParam): Promise<FetchResponse<200, types.WebhooksDeleteResponse200>>;
    /**
     * Update a single webhook in your account.
     *
     * Required authorization scope: `public.webhook:write`
     *
     * @summary Update a Webhook
     * @throws FetchError<422, types.WebhooksUpdateResponse422> failed event_types validations
     */
    webhooks_update(body: types.WebhooksUpdateBodyParam, metadata: types.WebhooksUpdateMetadataParam): Promise<FetchResponse<200, types.WebhooksUpdateResponse200>>;
    webhooks_update(metadata: types.WebhooksUpdateMetadataParam): Promise<FetchResponse<200, types.WebhooksUpdateResponse200>>;
}
declare const createSDK: SDK;
export = createSDK;
