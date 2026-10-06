//! Copy local settings once when a user switches from the standalone build to
//! the Store build. The separate Tauri identifiers keep their single-instance
//! locks independent, and also give each distribution its own app-data folder.

use std::path::Path;

pub fn copy_standalone_file_if_missing(target: &Path) -> Result<(), String> {
    if target.exists() {
        return Ok(());
    }
    let parent = target
        .parent()
        .and_then(Path::parent)
        .ok_or_else(|| "invalid Store app-data path".to_string())?;
    let name = target
        .file_name()
        .ok_or_else(|| "invalid Store app-data filename".to_string())?;
    let source = parent.join("com.abergin.terminal").join(name);
    if !source.is_file() {
        return Ok(());
    }
    std::fs::copy(&source, target).map_err(|error| {
        format!(
            "could not migrate {} from standalone Abergin: {error}",
            name.to_string_lossy()
        )
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::copy_standalone_file_if_missing;

    #[test]
    fn copies_old_state_once_without_overwriting_store_changes() {
        let root = std::env::temp_dir().join(format!(
            "abergin-store-migration-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let old = root.join("com.abergin.terminal");
        let new = root.join("com.abergin.terminal.store");
        std::fs::create_dir_all(&old).unwrap();
        std::fs::create_dir_all(&new).unwrap();
        let old_file = old.join("state.json");
        let new_file = new.join("state.json");
        std::fs::write(&old_file, "old").unwrap();
        copy_standalone_file_if_missing(&new_file).unwrap();
        assert_eq!(std::fs::read_to_string(&new_file).unwrap(), "old");
        std::fs::write(&new_file, "new").unwrap();
        copy_standalone_file_if_missing(&new_file).unwrap();
        assert_eq!(std::fs::read_to_string(&new_file).unwrap(), "new");
        std::fs::remove_file(old_file).unwrap();
        std::fs::remove_file(new_file).unwrap();
        std::fs::remove_dir(old).unwrap();
        std::fs::remove_dir(new).unwrap();
        std::fs::remove_dir(root).unwrap();
    }
}
