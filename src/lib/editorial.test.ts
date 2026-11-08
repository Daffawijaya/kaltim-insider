import test from "node:test"; import assert from "node:assert/strict"; import {isEditorialRole,readingMinutes,slugify} from "./editorial.ts";
test("slug artikel stabil dan aman untuk URL",()=>{assert.equal(slugify("Ruang Etam: Kabar Baik!"),"ruang-etam-kabar-baik")});
test("durasi baca tidak pernah nol",()=>{assert.equal(readingMinutes(""),1);assert.equal(readingMinutes(Array(201).fill("kata").join(" ")),2)});
test("admin dan redaktur dapat menerbitkan langsung",()=>{assert.equal(isEditorialRole("admin"),true);assert.equal(isEditorialRole("editor"),true);assert.equal(isEditorialRole("contributor"),false)});
