const COLOURS = [
  "Black", "White", "Cream", "Beige", "Brown", "Grey", "Navy", "Blue", "Sky blue", "Teal",
  "Green", "Emerald", "Olive", "Wine", "Maroon", "Red", "Pink", "Peach", "Lilac", "Purple",
  "Gold", "Mustard", "Silver",
];

/** Colour names offered by inputs with list="colour-names". */
export function ColourSuggestions() {
  return (
    <datalist id="colour-names">
      {COLOURS.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}
