Hooks.once("init", () => {});

Hooks.once("init", () => {
  game.settings.register("too-many-tokens-dnd", "dialogueShown", {
    name: "Hide hint",
    hint: "Hide the macro hint on start?",
    scope: "world",
    type: Boolean,
    default: false,
    config: true,
  });
  // Check if the dialogue should be displayed (based on a flag)
  const dialogueAlreadyShown = game.settings.get(
    "too-many-tokens-dnd",
    "dialogueShown"
  );
  if (!dialogueAlreadyShown) {
    // Display the dialogue to the GM
    new Dialog({
      title: "Assign TooManyTokens to selected tokens/actors",
      content: `
        <p>A macro for easy use with TooManyTokens is now included in the module.</p>
        <p>To get the macro go to your compendium packs and open "TooManyTokensDnD Macros". In there you will find the "Assign TooManyTokens to selected tokens/actors" macro.</p>
        <p>When used it opens a dialogue for each selected token where you can either apply a wildcard-path to the selected tokens or to their base actor.</p>
        <p>If the compendium is empty you can find the scripts in the module folder or <a href="https://github.com/IsThisMyRealName/too-many-tokens-dnd/blob/main/TooManyTokensSelectMacro.js">here</a>.</p>
      `,
      buttons: {
        ok: {
          label: "Got it!",
          callback: () => {
            // Set the flag to indicate that the dialogue has been shown
            game.settings.set("too-many-tokens-dnd", "dialogueShown", true);
          },
        },
      },
      close: () => {
        // Set the flag to indicate that the dialogue has been shown (if closed without pressing the button)
        game.settings.set("too-many-tokens-dnd", "dialogueShown", true);
      },
    }).render(true);
  }
});
