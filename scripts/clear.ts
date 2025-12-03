import { deleteAsync } from "del";
import { argv } from "node:process";

console.time("clear");

const deletedDirs = await deleteAsync(argv.slice(2));

console.log(`🔥 deleted: ${deletedDirs.join(",")}`);

console.timeEnd("clear");
