---
description: This describes the firebase structure for listing products for a user
---

# Listings

## What are listings

Listing are items that the user wants to buy or sell to other users in their ecosystem.

The path for this Actual items people own and can trade/sell | Trade requests, user profiles, "my items"

### Database Schema

#### Top level&#x20;

listings

a collection to hold all the listings on the site overall. Each listing document (products) have an unqiue ids that should never match under any circumstances.

#### Default Fields

Each product has it own default fields to help identify the item and to keep things structure, make sure we know who the item belong to, how much popularity is the items getting, the cost, etc. The default fields for each product are the following, for the MVP (Minimum Viable Product):

* availableForTrade
* Brand
* Color
* Condition
* Images
* ListingId
* Model
* OriginalPrice
* OwnerId
* ProductName
* ProductSku
* Status
* Size
* createdAt

