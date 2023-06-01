const fs = require('fs');

// Lire le fichier JSON existant
fs.readFile('./infos.json', 'utf8', (err, data) => {
    if (err) {
        console.log(`Error reading file from disk: ${err}`);
    } else {
        // Parse le JSON
        const logos = JSON.parse(data);

        // Ajoute les catégories à chaque logo
        for (let logo of logos) {
            logo.name = logo.name.trim()
        }

        // Convertit l'objet JavaScript en chaîne JSON
        const newJson = JSON.stringify(logos, null, 2); // Le deuxième paramètre null est un remplacement et le 3ème paramètre 2 est une indentation.

        // Écrire le nouveau JSON dans le fichier
        fs.writeFile('./infos.json', newJson, 'utf8', (err) => {
            if (err) {
                console.log(`Error writing file: ${err}`);
            } else {
                console.log('Categories added successfully!');
            }
        });
    }
});
