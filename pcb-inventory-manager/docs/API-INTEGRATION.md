
# Component Catalog Integration

## Selected Data Source

**JLCParts**

Repository: https://github.com/yaqwsx/jlcparts

Live Catalog: https://yaqwsx.github.io/jlcparts/

License: MIT

## Purpose

JLCParts will serve as the external component data source for the PCB Component BOM & Inventory Manager.

It provides searchable information about electronic components available through the JLCPCB assembly catalogue.

## Planned Features

- Search components by manufacturer part number (MPN).
- Search by LCSC part number or component description.
- Display component manufacturer and description.
- Display component category and technical attributes.
- Retrieve available datasheet links.
- Display available pricing information.
- Allow users to review component information before adding it to inventory.

## Integration Approach

JLCParts is not a conventional REST API. The application will use its publicly published component catalogue data.

The integration will:

1. Retrieve the published catalogue data.
2. Process and search the component records.
3. Display matching results in the application.
4. Allow users to select a component.
5. Populate the inventory form with the available information.
6. Require user confirmation before saving the component.

## Data Fields

The integration will attempt to retrieve:

- LCSC Part Number
- Manufacturer
- Component Description
- Category
- Technical Attributes
- Datasheet URL
- Product URL
- Available Price Information
- Stock Information, when available

## Limitations

- Catalogue coverage is focused on JLCPCB-supported components.
- Not all electronic components will be available.
- Pricing and stock information may change.
- The published catalogue may require downloading and indexing before searching.
- The integration must respect the source repository's license and data usage conditions.

## Security

No API credentials are required for accessing the publicly published catalogue data.

## Integration Status

Selected: JLCParts

Implementation: Pending
