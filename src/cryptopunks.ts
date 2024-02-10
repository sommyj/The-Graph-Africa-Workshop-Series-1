// Import necessary types from the Graph TypeScript library for handling big integers and byte arrays.
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

// Import the event types that the Graph node will listen to from the smart contract.
import { Assign, PunkTransfer } from "../generated/Cryptopunks/Cryptopunks";

// Import the schema definitions that we've defined for our subgraph.
import { Collector, DigitalArt, ArtTransfer } from "../generated/schema";

// Function to handle 'Assign' events emitted by the contract.
export function handleAssign(event: Assign): void {
  // Convert the 'to' address from the event to a hex string to use as the collector's ID.
  let collectorId = event.params.to.toHexString();

  // Attempt to load an existing collector from the subgraph by ID. If none exists, `null` is returned.
  let collector = Collector.load(collectorId);

  // If the collector does not already exist, create a new one with the given ID.
  if (!collector) {
    collector = new Collector(collectorId); // Instantiate a new Collector entity with the collectorId.
    collector.walletAddress = event.params.to; // Set the wallet address of the collector to the 'to' parameter from the event.
    collector.save(); // Save the new collector entity to the subgraph.
  }

  // Attempt to load an existing DigitalArt entity by using the punkIndex as its ID.
  let digitalArt = DigitalArt.load(event.params.punkIndex.toString());

  // If the digital art does not already exist, create a new one.
  if (!digitalArt) {
    digitalArt = new DigitalArt(event.params.punkIndex.toString()); // Create a new DigitalArt entity with the punkIndex as its ID.
    digitalArt.tokenId = event.params.punkIndex; // Set the tokenId of the digital art to the punkIndex from the event.
    digitalArt.owner = collector.id; // Set the owner of the digital art to the ID of the collector.
    digitalArt.save(); // Save the new digital art entity to the subgraph.
  }
}

// Define a function to handle 'PunkTransfer' events emitted by the Cryptopunks contract.
export function handlePunkTransfer(event: PunkTransfer): void {
  // Convert the punkIndex from the event to a string to use as the digital art's ID.
  let digitalArtId = event.params.punkIndex.toString();

  // Attempt to load an existing DigitalArt entity by its ID.
  let digitalArt = DigitalArt.load(digitalArtId);

  // If the digital art does not exist (which shouldn't happen if 'Assign' events are handled), create it.
  if (!digitalArt) {
    digitalArt = new DigitalArt(digitalArtId); // Instantiate a new DigitalArt entity.
    digitalArt.tokenId = event.params.punkIndex; // Set its tokenId.
  }

  // Retrieve the old owner's ID from the digital art entity.
  let oldCollectorId = digitalArt.owner;

  // Convert the new owner's address to a hex string to use as their ID.
  let newCollectorId = event.params.to.toHexString();

  // Attempt to load an existing collector (the new owner) from the subgraph by ID.
  let newCollector = Collector.load(newCollectorId);

  // If the new collector does not already exist, create a new one.
  if (!newCollector) {
    newCollector = new Collector(newCollectorId); // Instantiate a new Collector entity.
    newCollector.walletAddress = event.params.to; // Set the wallet address.
    newCollector.save(); // Persist the new collector entity to the subgraph.
  }

  // Create a new ArtTransfer entity to record the transfer of the digital art.
  let transfer = new ArtTransfer(event.transaction.hash.toHexString()); // Use the transaction hash as the ID for uniqueness.
  transfer.art = digitalArtId; // Associate the transfer with the digital art.
  transfer.oldOwner = Bytes.fromHexString(oldCollectorId); // Record the old owner. Requires conversion from string to Bytes.
  transfer.newOwner = event.params.to; // Record the new owner's address.
  transfer.timestamp = event.block.timestamp; // Record the timestamp of the transfer.
  transfer.save(); // Save the art transfer entity to the subgraph.

  // Update the digital art's owner to the new owner and save the changes.
  digitalArt.owner = newCollector.id;
  digitalArt.save();
}
