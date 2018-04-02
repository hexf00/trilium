"use strict";

const noteService = require('../../services/notes');
const labelService = require('../../services/labels');
const protectedSessionService = require('../../services/protected_session');
const repository = require('../../services/repository');

async function uploadFile(req) {
    const parentNoteId = req.params.parentNoteId;
    const file = req.file;
    const originalName = file.originalname;
    const size = file.size;

    const parentNote = await repository.getNote(parentNoteId);

    if (!parentNote) {
        return [404, `Note ${parentNoteId} doesn't exist.`];
    }

    const {note} = await noteService.createNewNote(parentNoteId, {
        title: originalName,
        content: file.buffer,
        target: 'into',
        isProtected: false,
        type: 'file',
        mime: file.mimetype
    });

    await labelService.createLabel(note.noteId, "original_file_name", originalName);
    await labelService.createLabel(note.noteId, "file_size", size);

    return {
        noteId: note.noteId
    };
}

async function downloadFile(req, res) {
    const noteId = req.params.noteId;
    const note = await repository.getNote(noteId);

    if (!note) {
        return res.status(404).send(`Note ${noteId} doesn't exist.`);
    }

    if (note.isProtected && !protectedSessionService.isProtectedSessionAvailable()) {
        res.status(401).send("Protected session not available");
        return;
    }

    const labelMap = await note.getLabelMap();
    const fileName = labelMap.original_file_name ? labelMap.original_file_name : note.title;

    res.setHeader('Content-Disposition', 'file; filename="' + fileName + '"');
    res.setHeader('Content-Type', note.mime);

    res.send(note.content);
}

module.exports = {
    uploadFile,
    downloadFile
};