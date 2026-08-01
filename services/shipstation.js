

async function getRatesForCarrier(carrierCode, shipmentDetails) {
    
    const request = await fetch('https://ssapi.shipstation.com/shipments/getrates', {
    method: 'POST',
    headers: {
        'Content-Type': "application/json",
        'Authorization':`Basic ${Buffer.from(`${process.env.SHIPSTATION_KEY}:${process.env.SHIPSTATION_SECRET_KEY}`).toString('base64')}`
    },
    body: JSON.stringify({ "carrierCode": carrierCode, ...shipmentDetails})
    })

    if(!request.ok) {
        throw new Error(`Response status: ${request.status}`)
    }

    const data = await request.json();
    // Merged carrier is lost once /rates/compare flattens all carriers'
    // arrays together -- tag it here so the UI/label-purchase step can
    // still tell which carrier+service a given rate came from.
    return data.map(rate => ({ ...rate, carrierCode }));

}

async function createLabel(labelDetails) {

    const request = await fetch('https://ssapi.shipstation.com/shipments/createlabel', {
    method: 'POST',
    headers: {
        'Content-Type': "application/json",
        'Authorization':`Basic ${Buffer.from(`${process.env.SHIPSTATION_KEY}:${process.env.SHIPSTATION_SECRET_KEY}`).toString('base64')}`
    },
    body: JSON.stringify(labelDetails)
    })

    if(!request.ok) {
        const errorBody = await request.text().catch(() => '');
        throw new Error(`Response status: ${request.status} - ${errorBody}`)
    }

    return await request.json();

}

module.exports = { getRatesForCarrier, createLabel }