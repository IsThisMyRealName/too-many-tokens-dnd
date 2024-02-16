// Macro for Too-Many-Tokens integration
const TooManyTokensMacro = async() => {
    // Wait for the Foundry VTT to be ready
    await game.ready;

    // Keep track of already processed actors to avoid duplicates
    const processedActors = new Set();

    const toResolve = canvas.tokens.controlled.length;
    if (toResolve <= 0) {
        ui.notifications.warn('No tokens selected. Please select at least one token.');
        return Promise.resolve(0);
    }
    // Iterate over all tokens on the canvas
    for (const token of canvas.tokens.controlled) {
        const actor = token.actor;

        // Check if the actor exists and has a name
        if (actor && actor.name) {
            const actorName = actor.name;
            console.log(`Trying to get too many tokens for ${actorName}`);
            // Check if the actor has already been processed
            if (!processedActors.has(actorName)) {
                processedActors.add(actorName);

                // Create the path to the module's subfolder for the actor
              const subfolderPath = `modules/too-many-tokens-dnd/${actorName}`;

              // Check if the subfolder exists
              FilePicker.browse("data", subfolderPath).then((result) => {
                
                if (result != null && result.target) {
                    // Get a list of all .webp files in the subfolder
                    const fileListUnModified = result.files.filter(file => ImageHelper.hasImageExtension(file));
                    if (fileListUnModified.length <= 0) {
                        ui.notifications.warn(`No files found in ${subfolderPath}`);
                    }
                    //Keep HalfOrc and HalfElf:
                    const halfOrcString = "HalfOrc";
                    const halfElfString = "HalfElf";
                    const halfOrcReplacementString = "Halforc";
                    const halfElfReplacementString = "Halfelf";

                    const fileList = fileListUnModified.map(item => item.replace(new RegExp(halfElfString, "g"), halfElfReplacementString).replace(new RegExp(halfOrcString, "g"), halfOrcReplacementString));

                    // Separate unique names into lists based on their position in the file name and remove the actor name
                    const nameLists = new Map();
                    const actorNameWithoutSpaces = actorName.replace(/\b\w/g, match => match.toUpperCase()).replace(/\s/g, "");
                    const fullNamesList = fileList.map((file => file.split("/").pop().split("%20")[0].replace(actorNameWithoutSpaces, "")));
                    fullNamesList.forEach((file) => {
                        const fileNameParts = [actorNameWithoutSpaces];
                        fileNameParts.push(...replaceAfterFirstDragonborn(file).split(/(?=[A-Z])/).filter(Boolean).map((part) => part));

                        fileNameParts.forEach((part, index) => {
                            if (!nameLists.has(index)) {
                                nameLists.set(index, new Set());
                            }
                            nameLists.get(index).add(part.replace(new RegExp(halfElfReplacementString, "g"), halfElfString).replace(new RegExp(halfOrcReplacementString, "g"), halfOrcString));
                        });
                    });
                    //===================================================================================
                    // Create and display a dialogue box for each actor
                    const dialogContent = document.createElement("div");
                    dialogContent.verticalAlign = "middle"
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

                                const checkbox = document.createElement("input");
                                checkbox.type = "checkbox";
                                checkbox.name = `checkbox-${actorName}-${index}`;
                                checkbox.value = item;
                                checkbox.id = `checkbox-${actorName}-${index}-${item}`;
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
                            label: `Randomize selected tokens for ${actorName}-tokens`,
                            callback: async() => {
                                // Get the checked checkboxes for each list
                                const checkedCheckboxes = getCheckedCheckboxes(nameLists, actorName);
                                // Create a wildcard path based on selected checkboxes
                                const wildcardPath = createWildcardPath(nameLists, checkedCheckboxes, actorName);

                                // Apply new token images for all selected tokens of that actor
                                applyTokenImages(actor, wildcardPath);
                            },
                        },
                        assignTokens: {
                            label: `Assign Too-Many-Tokens to actor ${actorName}`,
                            callback: async() => {
                                // Get the checked checkboxes for each list
                                const checkedCheckboxes = getCheckedCheckboxes(nameLists, actorName);
                                // Create a wildcard path based on selected checkboxes
                                const wildcardPath = createWildcardPath(nameLists, checkedCheckboxes, actorName);

                                // Apply the wildcard path to the actor
                                applyWildcardPathToActor(actor, wildcardPath);
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
                
            }
        } else {
            ui.notifications.warn($ `Actor for "${token.name}" not found or has no name.`);
        }
    };
    console.log(`Done`);
    return Promise.resolve(1);
};

// Function to create a wildcard path based on selected checkboxes
const createWildcardPath = (nameLists, checkedCheckboxes, actorName) => {
    let wildcardPath = `modules/too-many-tokens-dnd/${actorName}/`;
    nameLists.forEach((list, index) => {
        if (list.size > 0) {
            if (checkedCheckboxes[index].includes("*any") || checkedCheckboxes[index].length <= 0 || list.length <= 1) {
                // If *any is checked, use *
                wildcardPath += "*";
            } else {
                if (checkedCheckboxes[index].length == 1) {
                    wildcardPath += `${checkedCheckboxes[index][0]}`;
                } else {
                    wildcardPath += `{${checkedCheckboxes[index].join(",")}}`;
                }
            }
        }
    });
    wildcardPath += "*";
    wildcardPath = wildcardPath.replace(/\*+/g, '*');
    return wildcardPath;
};

// Function to apply new token images for all selected tokens of an actor
const applyTokenImages = async(actor, wildcardPath) => {
    const tokenDocument = await actor.getTokenDocument();
    const actorId = tokenDocument.actorId;
    let baseActor = game.actors.get(actorId);

    if (!baseActor) {
        ui.notifications.warn('Actor not found for the selected token.');
        return;
    }

    const selectedTokens = canvas.tokens.controlled.filter((token) => token.actor.name == baseActor.name);
    console.log(selectedTokens);
    const oldImgPath = baseActor.prototypeToken.texture.src;
    const wasRandomImgBefore = baseActor.prototypeToken.randomImg;
    let tokenImgArray = null;
    await baseActor.update({
        "prototypeToken.texture.src": wildcardPath,
        "prototypeToken.randomImg": true
    }).then(tokenImgArray = await baseActor.getTokenImages());
    tokenImgArray = await baseActor.getTokenImages();
    if (tokenImgArray != null && tokenImgArray.length > 0) {
        selectedTokens.forEach(async(token) => {
            if (true) {
                let imageChoice = Math.floor(Math.random() * tokenImgArray.length);
                let image = tokenImgArray[imageChoice];
                await token.document.update({
                    "texture.src": image
                });

            }
        });
        ui.notifications.info(`Found ${tokenImgArray.length} images for "${wildcardPath}"`);
    } else {
        ui.notifications.warn(`No images found for "${wildcardPath}"`);
    }
    await baseActor.update({
        "prototypeToken.texture.src": oldImgPath,
        "prototypeToken.randomImg": wasRandomImgBefore
    });
};

// Function to apply a wildcard path to the actor's token
const applyWildcardPathToActor = async(actor, wildcardPath) => {
    const tokenDocument = await actor.getTokenDocument();
    const actorId = tokenDocument.actorId;
    let baseActor = game.actors.get(actorId);

    const oldImgPath = baseActor.prototypeToken.texture.src;
    const wasRandomImgBefore = baseActor.prototypeToken.randomImg;
    let tokenImgArray = null;
    await baseActor.update({
        "prototypeToken.texture.src": wildcardPath,
        "prototypeToken.randomImg": true
    }).then(tokenImgArray = await baseActor.getTokenImages());
    tokenImgArray = await baseActor.getTokenImages();
    if (tokenImgArray != null && tokenImgArray.length > 0) {
        ui.notifications.info(`Found ${tokenImgArray.length} images for "${wildcardPath}"`);
    } else {
        ui.notifications.warn(`No images found for "${wildcardPath}".`);
        await baseActor.update({
            "prototypeToken.texture.src": oldImgPath,
            "prototypeToken.randomImg": wasRandomImgBefore
        });
    }
};

const getFileNamesForFolder = async(fileFolderName) => {
    const fileList = await FilePicker.browse("data", fileFolderName);
    const imageFiles = fileList.files.filter(f => ImageHelper.hasImageExtension(f));
    return imageFiles;
}

// Function to get the checked checkboxes for each list
const getCheckedCheckboxes = (nameLists, actorName) => {
    const checkedCheckboxes = [];
    nameLists.forEach((list, index) => {
        checkedCheckboxes[index] = Array.from(list).filter((item) => {
            const checkbox = document.getElementById(`checkbox-${actorName}-${index}-${item}`);
            return checkbox && checkbox.checked;
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

// Execute the macro
TooManyTokensMacro();
