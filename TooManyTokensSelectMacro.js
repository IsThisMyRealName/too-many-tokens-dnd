let folderPath = "modules/too-many-tokens-dnd/names.txt";

// Function to fetch subfolder names from the specified folder path
async function fetchSubfoldersAndRenderDialogue() {
  try {
    const response = await fetch(folderPath);
    const text = await response.text();
    const dropdownOptions = text
      .split("\n")
      .filter((line) => line.trim() !== "");
    renderDialog(dropdownOptions);
  } catch (error) {
    ui.notifications.error(
      `Error fetching names from ${folderPath}: ${error.message}`
    );
    return [];
  }
}

// Function to render the dialog with subfolder options
function renderDialog(dropdownOptions) {
  new Dialog({
    title: "Select Subfolder",
    content: `
      <form>
      <div class="form-group">
        <label for="actorSelect">Select an actor:</label>
        <input list="actorSelectList" id="actorSelect" name="actorSelect">
          <datalist id="actorSelectList" style="max-height: 200px; overflow-y: auto!important">
            ${dropdownOptions
              .map((option) => `<option value="${option}">${option}</option>`)
              .join("")}
          </datalist>
          </div>
          </form>
          <p style="font-style: italic; margin-top: 5px;">See all available tokens at <a href="https://toomanytokens.com/" target="_blank">toomanytokens.com</a>.</p>
    `,
    buttons: {
      execute: {
        label: "Execute TooManyTokensMacro",
        callback: (html) => {
          const selectedActor = html.find("#actorSelect")[0].value.trim();
          if (!selectedActor) {
            ui.notifications.warn("Please select a creature!");
            return;
          }
          TooManyTokensMacro(selectedActor);
        },
      },
      cancel: {
        label: "Cancel",
      },
    },
  }).render(true);
}

// Call renderDialog to display the dialog when the macro is executed
fetchSubfoldersAndRenderDialogue();

//==============================================================================================================

// Macro for Too-Many-Tokens integration
async function TooManyTokensMacro(selectedActor) {
  // Wait for the Foundry VTT to be ready
  await game.ready;

  const toResolve = canvas.tokens.controlled.length;
  if (toResolve <= 0) {
    ui.notifications.warn(
      "No tokens selected. Please select at least one token."
    );
    return Promise.resolve(0);
  }
  const actorName = selectedActor;
  console.log(`Trying to get too many tokens for ${actorName}`);

  // Create the path to the module's subfolder for the actor
  const subfolderPath = `modules/too-many-tokens-dnd/${actorName}`;

  // Check if the subfolder exists
  FilePicker.browse("data", subfolderPath)
    .then((result) => {
      if (result != null && result.target) {
        // Get a list of all .webp files in the subfolder
        const fileListUnModified = result.files.filter((file) =>
          ImageHelper.hasImageExtension(file)
        );
        if (fileListUnModified.length <= 0) {
          ui.notifications.warn(`No files found in ${subfolderPath}`);
        }

        const fileList = fileListUnModified;

        // Separate unique names into lists based on their position in the file name and remove the actor name
        const nameLists = new Map();
        const actorNameWithoutSpaces = actorName
          .replace(/\b\w/g, (match) => match.toUpperCase())
          .replace(/\s/g, "");
        const fullNamesList = fileList.map((file) =>
          file
            .split("/")
            .pop()
            .split("%20")[0]
            .replace(actorNameWithoutSpaces, "")
        );
        fullNamesList.forEach((file) => {
          const fileNameParts = [actorNameWithoutSpaces];
          fileNameParts.push(
            ...replaceCapitalizationAndRemoveSpaces(file, false)
              .split(/(?=[A-Z])/)
              .filter(Boolean)
              .map((part) => part)
          );

          fileNameParts.forEach((part, index) => {
            if (!nameLists.has(index)) {
              nameLists.set(index, new Set());
            }
            nameLists.get(index).add(part);
          });
        });
        //===================================================================================
        // Create and display a dialogue box for each actor
        const dialogContent = document.createElement("div");
        dialogContent.verticalAlign = "middle";
        // Iterate over the lists and create rows with checkboxes
        nameLists.forEach((list, index) => {
          const row = document.createElement("div");
          row.style.display = "inline-block";
          row.style.marginRight = "20px";

          if (list.size > 1) {
            // Add checkbox for *any only when there are more than one entry in the column
            const anyCheckbox = document.createElement("input");
            anyCheckbox.type = "checkbox";
            anyCheckbox.name = `any-checkbox-${actorName}-${index}`;
            anyCheckbox.id = `any-checkbox-${actorName}-${index}`;
            anyCheckbox.checked = false;

            const anyLabel = document.createElement("label");
            anyLabel.htmlFor = anyCheckbox.id;
            anyLabel.appendChild(document.createTextNode("*any"));

            const anyContainer = document.createElement("div");
            anyContainer.appendChild(anyCheckbox);
            anyContainer.appendChild(anyLabel);
            row.appendChild(anyContainer);
          }

          list.forEach((item) => {
            item = replaceCapitalizationAndRemoveSpaces(item, true);
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = `checkbox-${actorName}-${index}`;
            checkbox.value = item.replace(/\s/g, "");
            checkbox.id = `checkbox-${actorName}-${index}-${item.replace(
              /\s/g,
              ""
            )}`;
            // checkbox.checked = list.size == 1; // Check if it's the only item in the list
            // checkbox.disabled = list.size == 1; // Disable if it's the only item in the list

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.appendChild(document.createTextNode(item));

            const itemContainer = document.createElement("div");
            itemContainer.appendChild(checkbox);
            itemContainer.appendChild(label);
            row.appendChild(itemContainer);
          });

          // Add the row to the dialogue content
          dialogContent.appendChild(row);
        });
        // Create buttons for the dialogue box
        const buttons = {
          randomizeTokens: {
            label: `Randomize selected tokens`,
            callback: async () => {
              // Get the checked checkboxes for each list
              const checkedCheckboxes = getCheckedCheckboxes(
                nameLists,
                actorName
              );
              // Create a wildcard path based on selected checkboxes
              const wildcardPath = createWildcardPath(
                nameLists,
                checkedCheckboxes,
                actorName
              );

              // Apply new token images for all selected tokens of that actor
              applyTokenImages(actor, wildcardPath);
            },
          },
          assignTokens: {
            label: `Assign Too-Many-Tokens to selected tokens`,
            callback: async () => {
              // Get the checked checkboxes for each list
              const checkedCheckboxes = getCheckedCheckboxes(
                nameLists,
                actorName
              );
              // Create a wildcard path based on selected checkboxes
              const wildcardPath = createWildcardPath(
                nameLists,
                checkedCheckboxes,
                actorName
              );

              // Apply the wildcard path to the actor
              applyWildcardPathToActor(actor, wildcardPath, false);
            },
          },
          assignTokensAndUpdateActorImage: {
            label: `Assign Too-Many-Tokens to selected tokens and update actor image`,
            callback: async () => {
              // Get the checked checkboxes for each list
              const checkedCheckboxes = getCheckedCheckboxes(
                nameLists,
                actorName
              );
              // Create a wildcard path based on selected checkboxes
              const wildcardPath = createWildcardPath(
                nameLists,
                checkedCheckboxes,
                actorName
              );

              // Apply the wildcard path to the actor
              applyWildcardPathToActor(actor, wildcardPath, true);
            },
          },
          cancel: {
            label: "Cancel",
            callback: () => {
              // Close the dialogue
              dialog.close();
            },
          },
        };
        const dialog = new Dialog({
          title: `Lists for ${actorName}`,
          content: dialogContent.outerHTML,
          buttons,
        });
        dialog.position.width = "auto";
        dialog.render(true);

        //===================================================================================
      } else {
        subfolderExists = false;
        ui.notifications.warn(`Folder "${subfolderPath}" does not exist.`);
      }
    })
    .catch((error) => {
      ui.notifications.warn(`Folder "${subfolderPath}" does not exist.`);
    });
  return Promise.resolve(1);
}

// Function to create a wildcard path based on selected checkboxes
const createWildcardPath = (nameLists, checkedCheckboxes, actorName) => {
  let wildcardPath = `modules/too-many-tokens-dnd/${actorName}/`;
  nameLists.forEach((list, index) => {
    if (list.size > 0) {
      if (
        checkedCheckboxes[index].includes("*any") ||
        checkedCheckboxes[index].length <= 0 ||
        list.length <= 1
      ) {
        // If *any is checked, use *
        wildcardPath += "*";
      } else {
        if (checkedCheckboxes[index].length == 1) {
          wildcardPath += `${replaceCapitalizationAndRemoveSpaces(
            checkedCheckboxes[index][0],
            true
          ).replace(/\s/g, "")}`;
        } else {
          wildcardPath += `{${replaceCapitalizationAndRemoveSpaces(
            checkedCheckboxes[index].join(","),
            true
          ).replace(/\s/g, "")}}`;
        }
      }
    }
  });
  wildcardPath += "*";
  wildcardPath = wildcardPath.replace(/\*+/g, "*");
  return wildcardPath;
};

// Function to apply new token images for all selected tokens of an actor
const applyTokenImages = async (actor, wildcardPath) => {
  const tokenDocument = await actor.getTokenDocument();
  const actorId = tokenDocument.actorId;
  let baseActor = game.actors.get(actorId);

  if (!baseActor) {
    ui.notifications.warn("Actor not found for the selected token.");
    return;
  }

  const selectedTokens = canvas.tokens.controlled.filter(
    (token) => token.actor.name == baseActor.name
  );
  const oldImgPath = baseActor.prototypeToken.texture.src;
  const wasRandomImgBefore = baseActor.prototypeToken.randomImg;
  let tokenImgArray = null;
  await baseActor
    .update({
      "prototypeToken.texture.src": wildcardPath,
      "prototypeToken.randomImg": true,
    })
    .then((tokenImgArray = await baseActor.getTokenImages()));
  tokenImgArray = await baseActor.getTokenImages();
  if (tokenImgArray != null && tokenImgArray.length > 0) {
    selectedTokens.forEach(async (token) => {
      if (true) {
        let imageChoice = Math.floor(Math.random() * tokenImgArray.length);
        let image = tokenImgArray[imageChoice];
        await token.document.update({
          "texture.src": image,
        });
      }
    });
    ui.notifications.info(
      `Found ${tokenImgArray.length} images for "${wildcardPath}"`
    );
  } else {
    ui.notifications.warn(`No images found for "${wildcardPath}"`);
  }
  await baseActor.update({
    "prototypeToken.texture.src": oldImgPath,
    "prototypeToken.randomImg": wasRandomImgBefore,
  });
};

// Function to apply a wildcard path to the actor's token
const applyWildcardPathToActor = async (
  actor,
  wildcardPath,
  updateActorImage
) => {
  const tokenDocument = await actor.getTokenDocument();
  const actorId = tokenDocument.actorId;
  let baseActor = game.actors.get(actorId);

  const oldImgPath = baseActor.prototypeToken.texture.src;
  const wasRandomImgBefore = baseActor.prototypeToken.randomImg;
  let tokenImgArray = null;
  await baseActor
    .update({
      "prototypeToken.texture.src": wildcardPath,
      "prototypeToken.randomImg": true,
    })
    .then((tokenImgArray = await baseActor.getTokenImages()));
  tokenImgArray = await baseActor.getTokenImages();
  if (tokenImgArray != null && tokenImgArray.length > 0) {
    ui.notifications.info(
      `Found ${tokenImgArray.length} images for "${wildcardPath}"`
    );
    if (updateActorImage) {
      await baseActor.update({
        img: tokenImgArray[0],
      });
    }
  } else {
    ui.notifications.warn(`No images found for "${wildcardPath}".`);
    await baseActor.update({
      "prototypeToken.texture.src": oldImgPath,
      "prototypeToken.randomImg": wasRandomImgBefore,
    });
  }
};

const getFileNamesForFolder = async (fileFolderName) => {
  const fileList = await FilePicker.browse("data", fileFolderName);
  const imageFiles = fileList.files.filter((f) =>
    ImageHelper.hasImageExtension(f)
  );
  return imageFiles;
};

// Function to get the checked checkboxes for each list
const getCheckedCheckboxes = (nameLists, actorName) => {
  const checkedCheckboxes = [];
  nameLists.forEach((list, index) => {
    checkedCheckboxes[index] = Array.from(list).filter((item) => {
      item = replaceCapitalizationAndRemoveSpaces(item, true).replace(
        /\s/g,
        ""
      );
      const checkbox = document.getElementById(
        `checkbox-${actorName}-${index}-${item}`
      );
      return checkbox.value && checkbox.checked;
    });
  });
  return checkedCheckboxes;
};

function replaceAfterFirstDragonborn(inputString) {
  const index = inputString.indexOf("Dragonborn");
  if (index !== -1) {
    return inputString.substring(0, index + "Dragonborn".length);
  }
  return inputString;
}

function replaceCapitalizationAndRemoveSpaces(creatureName, isRestoring) {
  if (!creatureName) return "";
  const halfOrcString = "HalfOrc";
  const halfElfString = "HalfElf";
  const nsfwString = "NSFW";
  const halfOrcReplacementString = "Halforc";
  const halfElfReplacementString = "Halfelf";
  const nsfwReplacementString = "Nsfw";
  creatureName = replaceAfterFirstDragonborn(creatureName);
  if (isRestoring) {
    return creatureName
      .replace(halfElfReplacementString, halfElfString)
      .replace(halfOrcReplacementString, halfOrcString)
      .replace(nsfwReplacementString, nsfwString)
      .replace(/([A-Z])/g, " $1")
      .trim();
  } else {
    return creatureName
      .replace(" ", "")
      .replace(halfElfString, halfElfReplacementString)
      .replace(halfOrcString, halfOrcReplacementString)
      .replace(nsfwString, nsfwReplacementString);
  }
}
