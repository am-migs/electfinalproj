# Component Catalogue Integration

## Selected Data Source

**JLCParts**

- Repository: https://github.com/yaqwsx/jlcparts
- Live catalogue: https://yaqwsx.github.io/jlcparts/
- License: MIT (verify upstream license and data conditions when redistributing catalogue-derived data)

## Purpose

JLCParts provides searchable information about electronic components listed in the JLCPCB/LCSC assembly catalogue. The PCB Component BOM & Inventory Manager uses it as an optional source for component lookup and inventory-form prefill.

## Integration Status

**Implemented in the React inventory page.** The application imports `searchComponents` and `getCatalogueInformation` from `js/services/jlcparts.js`.

The current interface supports:
- Search by LCSC part number.
- Search by manufacturer or component description.
- Display LCSC number, manufacturer, description, and category when supplied by the catalogue.
- Prefill the inventory form from a selected result.
- User review and confirmation before saving the component to local inventory.

## Data Retrieval Approach

JLCParts is not a conventional REST API. The service reads its published catalogue data:
1. Retrieve the published manifest.
2. Read the search index or selected search bucket.
3. Load the relevant catalogue shard(s).
4. Decode component fields and attributes.
5. Return matching records to the browser interface.

No API key is required. Initial searches may download sizeable data files. Results depend on the upstream published dataset and network/browser support.

## Data Fields

The service currently decodes fields available in the catalogue schema, including:
- LCSC part number
- Manufacturer
- Component description
- Datasheet URL
- Price and stock fields, when present
- Image and product URL, when present
- Category/subcategory
- Technical attributes

The React inventory form currently uses the LCSC number, description, manufacturer, datasheet, category (when it matches a local category), and catalogue price when available. Catalogue pricing and stock should not be treated as guaranteed live values.

## Limitations and Validation

- Catalogue coverage is focused on JLCPCB-supported parts; not every component will be found.
- Catalogue publication cadence controls data freshness.
- The first search can take longer because indexes and data shards are downloaded.
- Search must be manually tested in the target browser with an active internet connection.
- No real-time inventory reservation or purchase ordering is performed.
- The catalogue search is optional; users can add components manually.

## Security

The integration does not require credentials or a private API key. Do not add third-party API keys or secret tokens to frontend source code.
