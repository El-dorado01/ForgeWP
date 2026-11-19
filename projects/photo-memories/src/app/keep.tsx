// //
// <div
//           ref={boardRef}
//           className='w-full aspect-16/13.5 md:aspect-16/8 min-h-[510px] md:min-h-[440px] rounded-[1.75rem] md:rounded-[2.5rem] border-10 md:border-16 border-[#3e2723] relative shadow-[inset_0_4px_20px_rgba(0,0,0,0.35),0_12px_28px_rgba(0,0,0,0.15)] overflow-hidden cursor-default transition-all duration-300'
//           style={{
//             backgroundColor: '#92613D',
//             backgroundImage: `
//               radial-gradient(rgba(0, 0, 0, 0.16) 9%, transparent 9%),
//               radial-gradient(rgba(255, 255, 255, 0.06) 9%, transparent 9%)
//             `,
//             backgroundSize: '6px 6px',
//             backgroundPosition: '0 0, 3px 3px',
//           }}
//         >
//           {/* Subtle wood-grain gradient overlay */}
//           <div className='absolute inset-0 bg-linear-to-tr from-black/15 via-transparent to-white/10 pointer-events-none z-0' />

//           {/* Render scattered photo cards */}
//           {photos.map((photo) => {
//             const isDragging = activeDragId === photo.id;
//             return (
//               <div
//                 key={photo.id}
//                 onMouseDown={(e) => handleDragStart(e, photo)}
//                 onTouchStart={(e) => handleDragStart(e, photo)}
//                 onDoubleClick={() => setLightboxPhoto(photo)}
//                 className={`absolute p-3 pb-5 rounded-xl shadow-lg transition-shadow duration-300 select-none cursor-grab flex flex-col justify-start items-center ${
//                   isDragging
//                     ? 'cursor-grabbing shadow-2xl scale-[1.03] ring-2 ring-amber-500/20'
//                     : 'hover:shadow-2xl hover:scale-[1.02] hover:rotate-0'
//                 }`}
//                 style={{
//                   left: `${photo.x}%`,
//                   top: `${photo.y}%`,
//                   width: '18.5%',
//                   minWidth: '135px',
//                   maxWidth: '200px',
//                   backgroundColor: photo.bgColor,
//                   transform: isDragging
//                     ? undefined
//                     : `rotate(${photo.rotation}deg)`,
//                   zIndex: zIndices[photo.id] || 1,
//                   border: `1.5px solid ${photo.bgColor === '#FFFFFF' ? '#e4e4e7' : 'rgba(0,0,0,0.06)'}`,
//                   boxShadow: isDragging
//                     ? '0 30px 50px rgba(0, 0, 0, 0.4)'
//                     : '0 10px 20px rgba(0, 0, 0, 0.2)',
//                   transition: isDragging
//                     ? 'transform 0.05s ease-out, shadow 0.15s ease'
//                     : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease',
//                   willChange: 'left, top, transform',
//                 }}
//               >
//                 {/* Washi Tape/Peg Decoration at top center */}
//                 <div className='absolute -top-3.5 left-1/2 -translate-x-1/2 w-10 h-6 bg-white/35 backdrop-blur-xs border border-white/20 -rotate-1 shadow-[0_1px_3px_rgba(0,0,0,0.08)] pointer-events-none z-10' />

//                 {/* Polaroid Image Wrapper */}
//                 <div className='w-full aspect-square bg-[#eceae6] rounded-md overflow-hidden relative group/img shadow-inner'>
//                   <img
//                     src={photo.image}
//                     alt={photo.caption}
//                     className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none'
//                   />
//                   <div className='absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none' />

//                   {/* Actions Overlay (visible on hover) */}
//                   <div className='absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/15 backdrop-blur-xs rounded-md'>
//                     <button
//                       onClick={() => setLightboxPhoto(photo)}
//                       title='Enlarge'
//                       className='p-1.5 bg-white/95 text-stone-700 hover:text-black rounded-full shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer'
//                     >
//                       <Maximize2 className='w-4 h-4' />
//                     </button>
//                     <button
//                       onClick={(e) => handleDeleteClick(photo.id, e)}
//                       title='Delete Memory'
//                       className='p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer'
//                     >
//                       <Trash2 className='w-4 h-4' />
//                     </button>
//                   </div>
//                 </div>

//                 {/* Polaroid Caption Text */}
//                 <div className='w-full text-center mt-3 px-1 flex flex-col items-center'>
//                   <span
//                     className='font-handwritten text-[1.05rem] md:text-[1.25rem] font-bold line-clamp-1 select-none'
//                     style={{ color: photo.textColor }}
//                   >
//                     {photo.caption}
//                   </span>

//                   {/* Bottom Bar: Interactive Likes & Delete */}
//                   <div className='mt-1.5 flex items-center justify-center gap-1.5 shrink-0 select-none'>
//                     <button
//                       onClick={(e) => handleLike(photo.id, e)}
//                       className='flex items-center gap-1 text-[11px] font-sans font-bold bg-black/5 hover:bg-black/10 active:bg-black/15 py-1 px-3 rounded-full transition-all cursor-pointer group/like'
//                       style={{ color: photo.textColor }}
//                       title='Like photo'
//                     >
//                       <Heart className='w-3.5 h-3.5 text-red-500 fill-red-500 group-hover/like:scale-120 transition-transform duration-200' />
//                       <span>{photo.likes}</span>
//                     </button>
//                     <button
//                       onClick={(e) => handleDeleteClick(photo.id, e)}
//                       className='flex items-center gap-1.5 text-[11px] font-sans font-bold bg-black/5 hover:bg-red-500 hover:text-white active:bg-red-600 py-1 px-2.5 rounded-full transition-all cursor-pointer group/delete'
//                       style={{ color: photo.textColor }}
//                       title='Delete memory'
//                     >
//                       <Trash2 className='w-3.5 h-3.5 text-stone-500 group-hover/delete:text-current transition-colors' />
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}

//           {/* Empty board state helper */}
//           {photos.length === 0 && (
//             <div className='absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-black/10 text-stone-100 animate-fade-in'>
//               <Sparkles className='w-12 h-12 mb-3 opacity-80' />
//               <p className='font-handwritten text-3xl font-bold'>
//                 The board is empty
//               </p>
//               <p className='text-xs font-sans mt-1 opacity-70'>
//                 Click "Add Memory" to pin a new photo card!
//               </p>
//             </div>
//           )}
//         </div>