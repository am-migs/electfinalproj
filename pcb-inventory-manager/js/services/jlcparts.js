
/*
|--------------------------------------------------------------------------
| JLCParts Component Catalogue Service
|--------------------------------------------------------------------------
| Retrieves and searches the publicly published JLCParts catalogue.
| No API key or paid service is required.
|--------------------------------------------------------------------------
*/

const DATA_BASE_URL =
    "https://yaqwsx.github.io/jlcparts/data/";

const MIN_SEARCH_LENGTH = 3;

let manifestCache = null;
let attributesCache = null;

const fileCache = new Map();

/*
|--------------------------------------------------------------------------
| FETCH AND DECOMPRESS DATA
|--------------------------------------------------------------------------
*/

async function fetchFile(filename, signal) {
    if (fileCache.has(filename)) {
        return fileCache.get(filename);
    }

    const response = await fetch(
        `${DATA_BASE_URL}${filename}`,
        { signal }
    );

    if (!response.ok) {
        throw new Error(
            `Unable to retrieve catalogue file: ${filename}`
        );
    }

    const buffer = await response.arrayBuffer();

    let content;

    if (
        filename.endsWith(".gz") ||
        response.headers.get("Content-Type")?.includes("gzip")
    ) {
        if (!window.DecompressionStream) {
            throw new Error(
                "This browser does not support gzip decompression."
            );
        }

        const stream = new Blob([buffer])
            .stream()
            .pipeThrough(
                new DecompressionStream("gzip")
            );

        content = await new Response(stream).text();

    } else {
        content = new TextDecoder().decode(buffer);
    }

    fileCache.set(filename, content);

    return content;
}

/*
|--------------------------------------------------------------------------
| MANIFEST
|--------------------------------------------------------------------------
*/

export async function getCatalogueManifest({
    reload = false,
    signal
} = {}) {
    if (manifestCache && !reload) {
        return manifestCache;
    }

    const response = await fetch(
        `${DATA_BASE_URL}manifest.json`,
        { signal }
    );

    if (!response.ok) {
        throw new Error(
            "Unable to connect to the JLCParts catalogue."
        );
    }

    manifestCache = await response.json();

    return manifestCache;
}

/*
|--------------------------------------------------------------------------
| CATALOGUE INFORMATION
|--------------------------------------------------------------------------
*/

export async function getCatalogueInformation() {
    const manifest = await getCatalogueManifest();

    return {
        totalComponents: manifest.totalComponents || 0,
        categories: manifest.categories || [],
        version: manifest.version || null,
        lastUpdated: manifest.created || null
    };
}

/*
|--------------------------------------------------------------------------
| ATTRIBUTE LOOKUP
|--------------------------------------------------------------------------
*/

async function getAttributesLookup(manifest, signal) {
    if (attributesCache) {
        return attributesCache;
    }

    const content = await fetchFile(
        manifest.attributesLut,
        signal
    );

    attributesCache = JSON.parse(content);

    return attributesCache;
}

/*
|--------------------------------------------------------------------------
| SEARCH HELPERS
|--------------------------------------------------------------------------
*/

function normalizeSearchWords(searchString) {
    return searchString
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function matchesSearch(text, words) {
    const normalizedText = String(text || "")
        .toLowerCase();

    return words.every(word =>
        normalizedText.includes(word)
    );
}

function parseSearchIndexLine(line) {
    const firstTab = line.indexOf("\t");
    const secondTab = line.indexOf(
        "\t",
        firstTab + 1
    );

    if (firstTab === -1 || secondTab === -1) {
        return null;
    }

    return {
        lcsc: line.slice(0, firstTab),
        shard: line.slice(firstTab + 1, secondTab),
        text: line.slice(secondTab + 1)
    };
}

function getSearchIndexFile(manifest, words) {
    const trigramData = manifest.searchTrigrams;

    if (!trigramData?.buckets) {
        return {
            file: manifest.searchIndex,
            gram: null
        };
    }

    const candidates = [];
    const gramSize = trigramData.gramSize || 3;

    for (const word of words) {
        if (word.length < gramSize) continue;

        for (
            let index = 0;
            index <= word.length - gramSize;
            index++
        ) {
            const gram = word.slice(
                index,
                index + gramSize
            );

            const bucket = trigramData.buckets[gram];

            if (bucket) {
                candidates.push({
                    ...bucket,
                    gram
                });
            }
        }
    }

    if (candidates.length === 0) {
        return {
            file: manifest.searchIndex,
            gram: null
        };
    }

    candidates.sort(
        (a, b) => a.rows - b.rows
    );

    return candidates[0];
}

/*
|--------------------------------------------------------------------------
| SEARCH INDEX
|--------------------------------------------------------------------------
*/

async function searchIndex(
    manifest,
    words,
    signal
) {
    if (!manifest.searchIndex) {
        throw new Error(
            "The catalogue does not provide a search index."
        );
    }

    if (manifest.searchIndexFormat !== "tsv-v1") {
        throw new Error(
            "The current JLCParts search index format is not supported."
        );
    }

    const selectedIndex = getSearchIndexFile(
        manifest,
        words
    );

    if (!selectedIndex.file) {
        return new Map();
    }

    const content = await fetchFile(
        selectedIndex.file,
        signal
    );

    const matchesByShard = new Map();

    const lines = content.split(/\r?\n/);

    for (let line of lines) {
        if (!line) continue;

        if (selectedIndex.gram) {
            const firstTab = line.indexOf("\t");

            if (
                firstTab === -1 ||
                line.slice(0, firstTab) !== selectedIndex.gram
            ) {
                continue;
            }

            line = line.slice(firstTab + 1);
        }

        const record = parseSearchIndexLine(line);

        if (!record) continue;

        if (!matchesSearch(record.text, words)) {
            continue;
        }

        if (!matchesByShard.has(record.shard)) {
            matchesByShard.set(
                record.shard,
                new Set()
            );
        }

        matchesByShard
            .get(record.shard)
            .add(record.lcsc);
    }

    return matchesByShard;
}

/*
|--------------------------------------------------------------------------
| COMPONENT DATA DECODING
|--------------------------------------------------------------------------
*/

function decodeAttributes(attributeIds, lookup) {
    const attributes = {};

    for (const id of attributeIds || []) {
        const attribute = lookup[id];

        if (!attribute) continue;

        attributes[attribute[0]] = attribute[1];
    }

    return attributes;
}

function decodeComponentRow(row, schema, attributeLookup) {
    return {
        lcsc: row[schema.lcsc] || "",
        manufacturer: row[schema.mfr] || "",
        description: row[schema.description] || "",
        datasheet: row[schema.datasheet] || "",
        price: row[schema.price] ?? null,
        image: row[schema.img] || "",
        productUrl: row[schema.url] || "",
        stock: row[schema.stock] ?? null,
        category: row[schema.subcategory] || "",
        attributes: decodeAttributes(
            row[schema.attributes],
            attributeLookup
        )
    };
}

/*
|--------------------------------------------------------------------------
| LOAD MATCHING COMPONENTS
|--------------------------------------------------------------------------
*/

async function loadMatchingComponents(
    manifest,
    matchesByShard,
    signal
) {
    if (matchesByShard.size === 0) {
        return [];
    }

    const attributeLookup = await getAttributesLookup(
        manifest,
        signal
    );

    const results = [];

    for (const [shardName, matchingParts] of matchesByShard) {
        if (signal?.aborted) {
            throw new DOMException(
                "Search cancelled.",
                "AbortError"
            );
        }

        const content = await fetchFile(
            shardName,
            signal
        );

        const lines = content.split(/\r?\n/);

        let schema = null;

        for (let index = 0; index < lines.length; index++) {
            if (!lines[index]) continue;

            const row = JSON.parse(lines[index]);

            if (index === 0) {
                schema = row;
                continue;
            }

            const lcscNumber = row[schema.lcsc];

            if (!matchingParts.has(lcscNumber)) {
                continue;
            }

            results.push(
                decodeComponentRow(
                    row,
                    schema,
                    attributeLookup
                )
            );
        }
    }

    return results;
}

/*
|--------------------------------------------------------------------------
| SEARCH COMPONENTS
|--------------------------------------------------------------------------
*/

export async function searchComponents(
    searchString,
    {
        limit = 30,
        signal
    } = {}
) {
    const query = String(searchString || "").trim();

    if (query.length < MIN_SEARCH_LENGTH) {
        return [];
    }

    if (signal?.aborted) {
        throw new DOMException(
            "Search cancelled.",
            "AbortError"
        );
    }

    const words = normalizeSearchWords(query);

    const manifest = await getCatalogueManifest({
        signal
    });

    const matchesByShard = await searchIndex(
        manifest,
        words,
        signal
    );

    const components = await loadMatchingComponents(
        manifest,
        matchesByShard,
        signal
    );

    return components
        .filter(component =>
            matchesSearch(
                [
                    component.lcsc,
                    component.manufacturer,
                    component.description
                ].join(" "),
                words
            )
        )
        .slice(0, Math.max(1, limit));
}

/*
|--------------------------------------------------------------------------
| GET COMPONENT BY LCSC NUMBER
|--------------------------------------------------------------------------
*/

export async function getComponentByLcsc(
    lcscNumber,
    { signal } = {}
) {
    const normalizedNumber = String(
        lcscNumber || ""
    ).trim().toUpperCase();

    if (!/^C\d+$/.test(normalizedNumber)) {
        throw new Error(
            "Enter a valid LCSC part number, such as C12345."
        );
    }

    const results = await searchComponents(
        normalizedNumber,
        {
            limit: 10,
            signal
        }
    );

    return results.find(component =>
        component.lcsc.toUpperCase() === normalizedNumber
    ) || null;
}

/*
|--------------------------------------------------------------------------
| CLEAR LOCAL CACHES
|--------------------------------------------------------------------------
*/

export function clearCatalogueCache() {
    manifestCache = null;
    attributesCache = null;

    fileCache.clear();
}
