"use strict";

var _ = require("lodash");

var { Command } = require("../command");
var requireInstance = require("../requireInstance");
var { populateInstanceDetails } = require("../management/database");
var { requirePermissions } = require("../requirePermissions");
var utils = require("../utils");
var profiler = require("../profiler");
var { Emulators } = require("../emulator/types");
var { warnEmulatorNotSupported } = require("../emulator/commandUtils");
const delay = require("delay");
const moment = require("moment");

var description = "profile the Realtime Database and generate a usage report";

module.exports = new Command("database:profile")
  .description(description)
  .option("-o, --output <filename>", "save the output to the specified file")
  .option(
    "-d, --duration <seconds>",
    "collect database usage information for the specified number of seconds"
  )
  .option("--raw", "output the raw stats collected as newline delimited json")
  .option("--no-collapse", "prevent collapsing similar paths into $wildcard locations")
  .option(
    "-i, --input <filename>",
    "generate the report based on the specified file instead " +
      "of streaming logs from the database"
  )
  .option(
    "--instance <instance>",
    "use the database <instance>.firebaseio.com (if omitted, use default database instance)"
  )
  .before(requirePermissions, ["firebasedatabase.instances.update"])
  .before(requireInstance)
  .before(populateInstanceDetails)
  .before(warnEmulatorNotSupported, Emulators.DATABASE)
  .action(function(options) {
    // Validate options
    if (options.raw && options.input) {
      return utils.reject("Cannot specify both an input file and raw format", {
        exit: 1,
      });
    } else if (options.parent.json && options.raw) {
      return utils.reject("Cannot output raw data in json format", { exit: 1 });
    } else if (options.input && _.has(options, "duration")) {
      return utils.reject("Cannot specify a duration for input files", {
        exit: 1,
      });
    } else if (_.has(options, "duration") && options.duration <= 0) {
      return utils.reject("Must specify a positive number of seconds", {
        exit: 1,
      });
    }

    console.log(options.output);
    console.log(options.duration);

    return loop(options);
  });

const loop = async (options) => {
  let count = 1;

  while (true) {
    options.output = `database_profile_log_${moment().format("YYYY_MM_DD_HH_mm_ss")}.txt`;

    await profiler(options);
    // await delay(1000 * 60);
    console.log(count);
    count++;
  }
};
