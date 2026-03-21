const { CamoufoxApi } = require('./dist/credentials/CamoufoxApi.credentials');
const { Camoufox } = require('./dist/nodes/Camoufox/Camoufox.node');

module.exports = {
	credentials: [CamoufoxApi],
	nodes: [Camoufox],
};
