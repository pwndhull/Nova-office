// SPDX-License-Identifier: MPL-2.0
//! Two offline replicas edit the same Notes page, then sync. Run:
//!   cargo run -p ycrdt --example demo
use ycrdt::NotesDoc;
fn main() {
    let laptop = NotesDoc::new(1);
    laptop.set_meta("title", "Trip plan");
    laptop.insert_block(0, "h", "heading");
    laptop.block_text_insert("h", 0, "Packing list");

    // phone starts from a snapshot of the laptop, then both go offline
    let phone = NotesDoc::from_snapshot(2, &laptop.encode_full()).unwrap();

    laptop.insert_block(1, "l1", "todo");
    laptop.block_text_insert("l1", 0, "Passport");
    phone.insert_block(1, "l2", "todo");
    phone.block_text_insert("l2", 0, "Charger");
    phone.block_text_insert("h", 7, " & todo"); // edit same heading concurrently

    // reconnect: exchange diffs both directions
    let l2p = laptop.encode_diff(&phone.state_vector());
    let p2l = phone.encode_diff(&laptop.state_vector());
    phone.apply_update(&l2p);
    laptop.apply_update(&p2l);

    println!("laptop == phone ? {}", laptop.blocks() == phone.blocks());
    println!("\nmerged document.json:\n{}", laptop.to_document_json());
}
