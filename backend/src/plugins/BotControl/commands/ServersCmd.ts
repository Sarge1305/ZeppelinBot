import { command } from "knub";
import { BotControlPluginType } from "../types";
import { isOwnerPreFilter } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import escapeStringRegexp from "escape-string-regexp";
import { createChunkedMessage, sorter } from "../../../utils";

export const ServersCmd = command<BotControlPluginType>()({
  trigger: ["servers", "guilds"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    search: ct.string({ catchAll: true, required: false }),

    all: ct.switchOption({ shortcut: "a" }),
    initialized: ct.switchOption({ shortcut: "i" }),
    uninitialized: ct.switchOption({ shortcut: "u" }),
  },

  async run({ pluginData, message: msg, args }) {
    const showList = Boolean(args.all || args.initialized || args.uninitialized || args.search);
    const search = args.search && new RegExp([...args.search].map(s => escapeStringRegexp(s)).join(".*"), "i");

    const joinedGuilds = Array.from(pluginData.client.guilds.values());
    const loadedGuilds = pluginData.getKnubInstance().getLoadedGuilds();
    const loadedGuildsMap = loadedGuilds.reduce((map, guildData) => map.set(guildData.guildId, guildData), new Map());

    if (showList) {
      let filteredGuilds = Array.from(joinedGuilds);

      if (args.initialized) {
        filteredGuilds = filteredGuilds.filter(g => loadedGuildsMap.has(g.id));
      }

      if (args.uninitialized) {
        filteredGuilds = filteredGuilds.filter(g => !loadedGuildsMap.has(g.id));
      }

      if (args.search) {
        filteredGuilds = filteredGuilds.filter(g => search.test(`${g.id} ${g.name}`));
      }

      if (filteredGuilds.length) {
        filteredGuilds.sort(sorter(g => g.name.toLowerCase()));
        const longestId = filteredGuilds.reduce((longest, guild) => Math.max(longest, guild.id.length), 0);
        const lines = filteredGuilds.map(g => {
          const paddedId = g.id.padEnd(longestId, " ");
          return `\`${paddedId}\` **${g.name}** (${loadedGuildsMap.has(g.id) ? "initialized" : "not initialized"}) (${
            g.memberCount
          } members)`;
        });
        createChunkedMessage(msg.channel, lines.join("\n"));
      } else {
        msg.channel.createMessage("No servers matched the filters");
      }
    } else {
      const total = joinedGuilds.length;
      const initialized = joinedGuilds.filter(g => loadedGuildsMap.has(g.id)).length;
      const unInitialized = total - initialized;

      msg.channel.createMessage(
        `I am on **${total} total servers**, of which **${initialized} are initialized** and **${unInitialized} are not initialized**`,
      );
    }
  },
});
