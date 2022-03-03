const DefaultSettings = {
    "logabnormal": false,
    "logmessage": false,
	"questballoon": false,
    "writelog": false,
    "logboss": false,
    "blacklist": [31020, 601611, 100700, 401704, 10155200, 10155201, 10155202, 10155204, 10155205, 10155206, 10155207, 10153510],
    "whitelist": [1000,1001,1002,1003,1004,1005,2000,3000,46601,46602,46701,46703,46704,76901,76902,76903,77704,77707,77730],
}

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(Object.assign({}, DefaultSettings), settings);
    } else if (from_ver === null) {
        // No config file exists, use default settings
        return DefaultSettings;
    } else {
        // Migrate from older version (using the new system) to latest one
        throw new Error('So far there is only one settings version and this should never be reached!');
    }
}
