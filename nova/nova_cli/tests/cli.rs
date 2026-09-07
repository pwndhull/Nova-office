// SPDX-License-Identifier: MPL-2.0
// End-to-end test of the `nova` binary: two workspaces edit a page offline,
// then sync, and must converge to a byte-identical document.json.

use std::process::Command;

fn nova(ws: &str, args: &[&str]) -> String {
    let bin = env!("CARGO_BIN_EXE_nova");
    let out = Command::new(bin)
        .arg("--workspace")
        .arg(ws)
        .args(args)
        .output()
        .expect("run nova");
    assert!(
        out.status.success(),
        "nova {args:?} failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8(out.stdout).unwrap().trim().to_string()
}

#[test]
fn offline_edit_then_sync_converges() {
    let dir = std::env::temp_dir().join(format!("nova-cli-test-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let laptop = dir.join("laptop");
    let phone = dir.join("phone");
    std::fs::create_dir_all(&laptop).unwrap();
    let l = laptop.to_str().unwrap();
    let p = phone.to_str().unwrap();

    nova(l, &["init", "--name", "Laptop"]);
    let page = nova(l, &["page", "new", "Trip plan"]);
    nova(l, &["block", "add", &page, "heading", "Packing list"]);
    nova(l, &["block", "add", &page, "todo", "Passport"]);

    // phone = a copy (first sync)
    copy_dir(&laptop, &phone);

    // both edit offline
    nova(l, &["block", "add", &page, "todo", "Sunscreen"]);
    nova(p, &["block", "add", &page, "todo", "Adapter"]);

    // sync both ways
    let r1 = nova(l, &["sync", &page, "--from", p]);
    let r2 = nova(p, &["sync", &page, "--from", l]);
    assert!(
        r1.contains("converged: \x1b[32myes") || r1.contains("converged: yes"),
        "{r1}"
    );
    assert!(r2.contains("converged"), "{r2}");

    let ja = nova(l, &["page", "show", &page, "--json"]);
    let jb = nova(p, &["page", "show", &page, "--json"]);
    assert_eq!(ja, jb, "replicas must converge to identical document.json");

    for todo in ["Passport", "Sunscreen", "Adapter"] {
        assert!(ja.contains(todo), "missing {todo} in {ja}");
    }
    let _ = std::fs::remove_dir_all(&dir);
}

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).unwrap();
    for entry in std::fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let dst = to.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_dir(&entry.path(), &dst);
        } else {
            std::fs::copy(entry.path(), dst).unwrap();
        }
    }
}
