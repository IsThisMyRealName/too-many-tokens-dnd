Hooks.once('init', () => {
  
});

Hooks.once('init', () => {
  
  game.settings.register("too-many-tokens-dnd", "dialogueShown", {
    name: "Show update window",
    hint: "TOOMANYTOKENSDND.dialogueShownHint",
    scope: "world",
    type: Boolean,
    default: false,
    config: false
  });
  // Check if the dialogue should be displayed (based on a flag)
  const dialogueAlreadyShown = game.settings.get("too-many-tokens-dnd", "dialogueShown");
  if (!dialogueAlreadyShown) {
    // Display the dialogue to the GM
    new Dialog({
      title: "Assign TooManyTokens to selected tokens/actors",
      content: `
        <p>A macro for easy use with TooManyTokens is now included in the module.</p>
        <p>To get the macro go to your compendium packs and open "TooManyTokensDnD Macros". In there you will find the "Assign TooManyTokens to selected tokens/actors" macro.</p>
        <p>When used it opens a dialogue for each selected token where you can either apply a wildcard-path to the selected tokens or to their base actor.</p>
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