export function create_reference_id(data: {
  name?: string;
  gst?: string;
}): string {

console.log(data)
  if (!data.name || !data.gst) {
    throw new Error("Name and GST number are required");
  }

  const namePart = data.name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

  const gstPart = data.gst
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(-4);

  if (gstPart.length !== 4) {
    throw new Error("Invalid GST number");
  }

  return `${namePart}-${gstPart}`;
}
